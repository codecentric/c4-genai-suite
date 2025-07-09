import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromptEntity, PromptRatingEntity, PromptUsageEntity, PromptVersionEntity } from '../database';
import { CreatePromptDto, PaginationOptions, PromptFilters, UpdatePromptDto } from './interfaces';

@Injectable()
export class PromptsService {
  constructor(
    @InjectRepository(PromptEntity)
    private readonly promptRepository: Repository<PromptEntity>,
    @InjectRepository(PromptUsageEntity)
    private readonly promptUsageRepository: Repository<PromptUsageEntity>,
    @InjectRepository(PromptRatingEntity)
    private readonly promptRatingRepository: Repository<PromptRatingEntity>,
    @InjectRepository(PromptVersionEntity)
    private readonly promptVersionRepository: Repository<PromptVersionEntity>,
  ) {}

  async create(authorId: string, createPromptDto: CreatePromptDto): Promise<PromptEntity> {
    const prompt = this.promptRepository.create({
      ...createPromptDto,
      authorId,
    });

    const savedPrompt = await this.promptRepository.save(prompt);

    // Create initial version
    await this.createInitialVersion(savedPrompt);

    return savedPrompt;
  }

  async findAll(
    filters: PromptFilters = {},
    pagination: PaginationOptions = {},
    currentUserId?: string,
  ): Promise<{
    items: PromptEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = pagination;

    const queryBuilder = this.promptRepository
      .createQueryBuilder('prompt')
      .leftJoinAndSelect('prompt.author', 'author')
      .leftJoinAndSelect('prompt.category', 'category')
      .leftJoinAndSelect('prompt.originalPrompt', 'originalPrompt');

    // Apply visibility filter: public prompts OR own prompts
    if (currentUserId) {
      queryBuilder.andWhere('(prompt.isPublic = true OR prompt.authorId = :currentUserId)', { currentUserId });
    } else {
      queryBuilder.andWhere('prompt.isPublic = true');
    }

    // Apply filters
    if (filters.categoryId) {
      queryBuilder.andWhere('prompt.categoryId = :categoryId', { categoryId: filters.categoryId });
    }

    if (filters.authorId) {
      queryBuilder.andWhere('prompt.authorId = :authorId', { authorId: filters.authorId });
    }

    if (filters.isPublic !== undefined) {
      queryBuilder.andWhere('prompt.isPublic = :isPublic', { isPublic: filters.isPublic });
    }

    if (filters.search) {
      queryBuilder.andWhere('(prompt.title ILIKE :search OR prompt.description ILIKE :search OR prompt.content ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    if (filters.minRating !== undefined) {
      queryBuilder.andWhere('prompt.averageRating >= :minRating', { minRating: filters.minRating });
    }

    // Apply sorting
    queryBuilder.orderBy(`prompt.${sortBy}`, sortOrder);

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<PromptEntity | null> {
    return this.promptRepository.findOne({
      where: { id },
      relations: ['author', 'category', 'originalPrompt', 'ratings'],
    });
  }

  async findByAuthor(
    authorId: string,
    pagination: PaginationOptions = {},
  ): Promise<{
    items: PromptEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.findAll({ authorId }, pagination);
  }

  async update(id: number, authorId: string, updatePromptDto: UpdatePromptDto): Promise<PromptEntity> {
    const prompt = await this.promptRepository.findOne({
      where: { id, authorId },
    });

    if (!prompt) {
      throw new Error('Prompt not found or not authorized');
    }

    Object.assign(prompt, updatePromptDto);
    return this.promptRepository.save(prompt);
  }

  async delete(id: number, authorId: string): Promise<void> {
    const result = await this.promptRepository.delete({ id, authorId });

    if (result.affected === 0) {
      throw new Error('Prompt not found or not authorized');
    }
  }

  async clone(id: number, authorId: string, title?: string): Promise<PromptEntity> {
    const originalPrompt = await this.findOne(id);

    if (!originalPrompt || !originalPrompt.isPublic) {
      throw new Error('Prompt not found or not public');
    }

    const clonedPrompt = this.promptRepository.create({
      title: title || `${originalPrompt.title} (Copy)`,
      content: originalPrompt.content,
      description: originalPrompt.description,
      categoryId: originalPrompt.categoryId,
      authorId,
      originalPromptId: originalPrompt.id,
      isPublic: false, // Cloned prompts are private by default
    });

    return this.promptRepository.save(clonedPrompt);
  }

  async recordUsage(promptId: number, userId: string): Promise<void> {
    // Record usage
    const usage = this.promptUsageRepository.create({
      promptId,
      userId,
    });
    await this.promptUsageRepository.save(usage);

    // Update usage count
    await this.promptRepository.increment({ id: promptId }, 'usageCount', 1);
  }

  async getPopularPrompts(limit: number = 10): Promise<PromptEntity[]> {
    return this.promptRepository.find({
      where: { isPublic: true },
      order: { usageCount: 'DESC', averageRating: 'DESC' },
      take: limit,
      relations: ['author', 'category'],
    });
  }

  async getRecentPrompts(limit: number = 10): Promise<PromptEntity[]> {
    return this.promptRepository.find({
      where: { isPublic: true },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['author', 'category'],
    });
  }

  async updateRatingStats(promptId: number): Promise<void> {
    const result: { averageRating: string; ratingCount: string } | undefined = await this.promptRatingRepository
      .createQueryBuilder('rating')
      .select('AVG(rating.rating)', 'averageRating')
      .addSelect('COUNT(rating.id)', 'ratingCount')
      .where('rating.promptId = :promptId', { promptId })
      .getRawOne();

    const averageRating = result ? parseFloat(result.averageRating) || 0 : 0;
    const ratingCount = result ? parseInt(result.ratingCount, 10) || 0 : 0;

    await this.promptRepository.update(promptId, {
      averageRating,
      ratingCount,
    });
  }

  // Versioning methods
  async createVersion(promptId: number, authorId: string, updateData: UpdatePromptDto): Promise<PromptEntity> {
    const prompt = await this.promptRepository.findOne({
      where: { id: promptId, authorId },
    });

    if (!prompt) {
      throw new Error('Prompt not found or not authorized');
    }

    if (!updateData.versionComment) {
      throw new Error('Version comment is required');
    }

    // Mark current version as not current
    await this.promptVersionRepository.update({ promptId, isCurrent: true }, { isCurrent: false });

    // Create new version
    const newVersionNumber = prompt.currentVersion + 1;
    const newVersion = this.promptVersionRepository.create({
      promptId,
      versionNumber: newVersionNumber,
      title: updateData.title || prompt.title,
      description: updateData.description || prompt.description,
      content: updateData.content || prompt.content,
      categoryId: updateData.categoryId || prompt.categoryId,
      versionComment: updateData.versionComment,
      createdBy: authorId,
      isCurrent: true,
    });

    await this.promptVersionRepository.save(newVersion);

    // Update prompt with new data and version number
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { versionComment, ...promptUpdateData } = updateData;
    Object.assign(prompt, promptUpdateData, { currentVersion: newVersionNumber });
    return this.promptRepository.save(prompt);
  }

  async getVersions(promptId: number): Promise<PromptVersionEntity[]> {
    return this.promptVersionRepository.find({
      where: { promptId },
      order: { versionNumber: 'DESC' },
      relations: ['author'],
    });
  }

  async getVersion(promptId: number, versionNumber: number): Promise<PromptVersionEntity | null> {
    return this.promptVersionRepository.findOne({
      where: { promptId, versionNumber },
      relations: ['author'],
    });
  }

  async restoreVersion(promptId: number, versionNumber: number, authorId: string, versionComment: string): Promise<PromptEntity> {
    const prompt = await this.promptRepository.findOne({
      where: { id: promptId, authorId },
    });

    if (!prompt) {
      throw new Error('Prompt not found or not authorized');
    }

    const versionToRestore = await this.getVersion(promptId, versionNumber);
    if (!versionToRestore) {
      throw new Error('Version not found');
    }

    // Create new version based on the restored version
    return this.createVersion(promptId, authorId, {
      title: versionToRestore.title,
      description: versionToRestore.description,
      content: versionToRestore.content,
      categoryId: versionToRestore.categoryId,
      versionComment,
    });
  }

  async createInitialVersion(prompt: PromptEntity): Promise<void> {
    const initialVersion = this.promptVersionRepository.create({
      promptId: prompt.id,
      versionNumber: 1,
      title: prompt.title,
      description: prompt.description,
      content: prompt.content,
      categoryId: prompt.categoryId,
      versionComment: 'Erste Version',
      createdBy: prompt.authorId,
      isCurrent: true,
    });

    await this.promptVersionRepository.save(initialVersion);
  }
}
