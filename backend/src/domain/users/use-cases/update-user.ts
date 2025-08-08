import { createHash } from 'crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity, UserRepository } from 'src/domain/database';
import { assignDefined, isNull } from 'src/lib';
import { User } from '../interfaces';
import { buildUser } from './utils';

type Values = Partial<Pick<User, 'apiKey' | 'name' | 'email' | 'userGroupId'> & { password: string; currentPassword?: string }>;

export class UpdateUser {
  constructor(
    public readonly id: string,
    public readonly values: Values,
  ) {}
}

export class UpdateUserResponse {
  constructor(public readonly user: User) {}
}

@CommandHandler(UpdateUser)
export class UpdateUserHandler implements ICommandHandler<UpdateUser, UpdateUserResponse> {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: UserRepository,
  ) {}

  async execute(request: UpdateUser): Promise<UpdateUserResponse> {
    const { id, values } = request;
    const { apiKey, email, name, password, userGroupId, currentPassword } = values;

    const entity = await this.users.findOneBy({ id });

    if (!entity) {
      throw new NotFoundException();
    }

    if (password) {
      if (currentPassword) {
        const isValid = await bcrypt.compare(currentPassword, entity.passwordHash!);
        if (!isValid) {
          throw new BadRequestException('The current password does not match');
        }
      }

      entity.passwordHash = await bcrypt.hash(password, 10);
    }

    if (apiKey) {
      entity.apiKey = createHash('sha256').update(apiKey).digest('hex');
    } else if (isNull(apiKey)) {
      entity.apiKey = undefined;
    }

    // Assign the object manually to avoid updating unexpected values.
    assignDefined(entity, { email, name, userGroupId });

    // Use the save method otherwise we would not get previous values.
    const updated = await this.users.save(entity);
    const result = buildUser(updated);

    return new UpdateUserResponse(result);
  }
}
