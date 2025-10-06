import { forwardRef, Inject, Logger, NotFoundException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { z } from 'zod';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext, NamedStructuredTool } from 'src/domain/chat';
import { BucketEntity, BucketRepository, FileEntity, FileRepository } from 'src/domain/database';
import { Extension, ExtensionConfiguration, ExtensionEntity, ExtensionSpec } from 'src/domain/extensions';
import { Bucket, GetDocumentContent, GetDocumentContentResponse, SearchFiles, SearchFilesResponse } from 'src/domain/files';
import { GetDocumentPdf, GetDocumentPdfResponse } from 'src/domain/files/use-cases/get-document-pdf';
import { User } from 'src/domain/users';
import { I18nService } from '../../localization/i18n.service';

@Extension()
export class FilesExtension<T extends FilesExtensionConfiguration = FilesExtensionConfiguration>
  implements Extension<FilesExtensionConfiguration>
{
  constructor(
    @Inject(forwardRef(() => QueryBus))
    protected readonly queryBus: QueryBus,
    @InjectRepository(BucketEntity)
    protected readonly buckets: BucketRepository,
    @InjectRepository(FileEntity)
    protected readonly files: FileRepository,
    protected readonly i18n: I18nService,
  ) {}

  get spec(): ExtensionSpec {
    return {
      name: 'files-42',
      group: 'files',
      groupWhitelist: ['files-42', 'files-whole', 'files-vision'],
      title: this.i18n.t('texts.extensions.files.title'),
      logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" xml:space="preserve"><linearGradient id="a" gradientUnits="userSpaceOnUse" x1="39.446" y1="801.241" x2="182.915" y2="944.694" gradientTransform="matrix(5.2695 0 0 -5.2695 -85.79 5100.133)"><stop offset=".05" stop-color="#07b0d3"/><stop offset=".229" stop-color="#4bb8cf"/><stop offset=".744" stop-color="#93ccb9"/><stop offset="1" stop-color="#a8d2af"/></linearGradient><path d="M533.1 834.4c-8.5-8.5-22.1-9.3-32.3-2.5-42.9 29.5-93.7 45.3-145.8 45.5-147.5 0-267.1-121.6-263.1-270.3 3.4-143.7 124.5-257.2 268.3-257.2h282.3c26.8 0 51 19.7 54.4 45.9 3.7 29.2-16.9 55.8-46.1 59.5-2.2.3-4.4.4-6.7.4H359.2c-77 0-142.9 60-145.8 136.8-2.9 80.8 62.1 148 142.5 148H639c193 0 355-152.6 358.4-345.7C1001 199.4 845.5 38 650.1 34.4c-1.7 0-3.4-.1-5.1-.1-60 0-136 14.4-204.5 65-12.3 8.2-13.6 27.2-2.9 37.8l29.3 29.3c8.5 8.5 22.1 9.3 32.3 2.5 42.9-29.5 93.7-45.3 145.8-45.5 147.5 0 267.1 121.6 263.1 269.9-3.4 143.7-124.5 257.2-268.3 257.2H357.6c-26.8 0-51-19.2-54.4-45.9-3.7-29.2 16.9-55.8 46.1-59.5 2.2-.3 4.4-.4 6.7-.4h284.8c77 0 142.9-60 145.8-136.8 2.9-80.8-62.1-148-142.5-148H360.9c-193-.3-354.5 152.4-358.4 345.4-3.6 195.4 151.9 356.8 347.3 360.4 1.7 0 3.4.1 5.1.1 60 0 136-14.4 204.5-65 12.3-8.2 13.6-27.2 2.9-37.8l-29.2-28.6z" fill="url(#a)"/></svg>',
      description: this.i18n.t('texts.extensions.files.description'),
      type: 'tool',
      arguments: {
        description: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.description'),
          description: this.i18n.t('texts.extensions.files.descriptionHint'),
          required: true,
          format: 'textarea',
        },
        bucket: {
          type: 'number',
          title: this.i18n.t('texts.extensions.common.bucket'),
          description: this.i18n.t('texts.extensions.files.bucketHint'),
          required: true,
          format: 'bucket',
          showInList: true,
        },
        take: {
          type: 'number',
          title: this.i18n.t('texts.extensions.common.take'),
          description: this.i18n.t('texts.extensions.files.takeHint'),
          required: false,
          default: 20,
        },
        showSources: {
          type: 'boolean',
          title: this.i18n.t('texts.extensions.files.showSources'),
          description: this.i18n.t('texts.extensions.files.showSourcesHint'),
          required: false,
          default: true,
        },
      },
      userArguments: {
        type: 'object',
        title: this.i18n.t('texts.extensions.files.title'),
        description: this.i18n.t('texts.extensions.files.description'),
        properties: {
          fileIdFilter: {
            type: 'string',
            title: this.i18n.t('texts.extensions.common.fileIds'),
            format: 'c4-ui',
          },
        },
      },
    };
  }

  getMiddlewares(user: User, extension: ExtensionEntity<T>): Promise<ChatMiddleware[]> {
    const middleware = {
      invoke: async (context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> => {
        const { bucket, description, take, showSources } = extension.values;

        let toolDescription = 'Use this tool to semantically search files.\n\n';
        toolDescription += [
          '* Use this tool in combination with other file-related tools, as each may access different files',
          '* Use this tool whenever the user refers to any external source (e.g., document, file, recording, video)',
          '* When unsure, prefer to use the tool to ensure accuracy and completeness',
          '* Do not guess file names or contents; only search within the files uploaded by the user',
          '* Do not link to the files',
          '* This tool returns only relevant snippets (short extracts) from files, not full documents',
          '* If a user request cannot be fulfilled with a snippet (e.g., generating a summary), inform the user that this tool is not suitable for that purpose',
          "* If the information returned by this tool is irrelevant to the user's query, ignore it",
        ].join('\n');
        toolDescription += '\n\n';

        let enrichedDescription = toolDescription + description;

        // If this is a User-Bucket, we need to enrich the description with all included files to allow the
        // LLM to ask it relevant questions.
        const bucketEntity = await this.buckets.findOneBy({ id: bucket });
        if (!bucketEntity) {
          throw new NotFoundException(`Bucket with id '${bucket}' was not found`);
        }

        if (bucketEntity.type === 'user') {
          const files = await this.files.findBy({ bucketId: bucket, userId: user.id });
          const fileIdFilter: number[] = context.files?.map((x) => x.id) ?? [];
          const filesSelected = files.filter((f) => fileIdFilter.includes(f.id));

          toolDescription += '* Users can upload files to their user library using the drop zone in the right side bar.\n';
          toolDescription += '* The library files are persistent over many conversations.\n\n';

          let enrichment = 'Currently the user did not upload any files to his library, so there are no files available.';
          if (filesSelected.length > 0) {
            enrichment = `The user has uploaded ${filesSelected.length} files to their library.`;
          }
          // note that the `description` is omitted for user buckets, since it does not have any value here
          enrichedDescription = toolDescription + enrichment;

          const fileList = filesSelected?.map((x) => `* ${x.fileName}`).join('\n');

          // with the list of files it is easy to break the 1024 character limit for tool descriptions
          // we omit the list of files in that case
          if ((enrichedDescription + fileList).length < 1024) {
            enrichedDescription += `\n\n${fileList}`;
          }

          context.tools.push(
            new InternalTool(
              enrichedDescription,
              this.queryBus,
              context,
              bucketEntity,
              take,
              extension.externalId,
              filesSelected.map((x) => x.id),
              showSources,
            ),
          );
        } else {
          context.tools.push(
            new InternalTool(
              enrichedDescription,
              this.queryBus,
              context,
              bucketEntity,
              take,
              extension.externalId,
              null,
              showSources,
            ),
          );
        }

        return next(context);
      },
    };

    return Promise.resolve([middleware]);
  }

  async getChunks(configuration: FilesExtensionConfiguration, _: string, chunkUris: string[]): Promise<string[]> {
    const bucketId = configuration.bucket;
    const response: GetDocumentContentResponse = await this.queryBus.execute(new GetDocumentContent(bucketId, chunkUris));
    return response.documentContent.filter((x) => x != null);
  }

  async getDocument(configuration: FilesExtensionConfiguration, documentUri: string, user: User) {
    const bucketId = configuration.bucket;
    const response: GetDocumentPdfResponse = await this.queryBus.execute(new GetDocumentPdf(user, bucketId, documentUri));

    const buffer = await response.documentPdf?.bytes();
    if (!buffer) {
      throw new NotFoundException('Document can not be retrieved.');
    }

    const file = new File([buffer], '', { type: 'application/pdf' });

    return Promise.resolve(file);
  }
}

class InternalTool extends NamedStructuredTool {
  readonly name: string;
  readonly displayName = 'Files';
  private readonly logger = new Logger(`${FilesExtension.name}$${InternalTool.name}`);

  readonly schema = z.object({
    query: z.string().describe('The query'),
  });

  constructor(
    public readonly description: string,
    private readonly queryBus: QueryBus,
    private readonly context: ChatContext,
    private readonly bucket: Bucket,
    private readonly take: number,
    private readonly extensionExternalId: string,
    private readonly fileFilter: number[] | null,
    private readonly showSources: boolean,
  ) {
    super();

    this.name = extensionExternalId;
  }

  protected async _call(arg: z.infer<typeof this.schema>): Promise<string> {
    try {
      const result: SearchFilesResponse = await this.queryBus.execute(
        new SearchFiles(this.bucket.id, arg.query, this.context.user, this.take, this.fileFilter, this.context.conversationId),
      );

      if (result.sources && this.showSources) {
        this.context.history?.addSources(this.extensionExternalId, result.sources);
      } else if (result.debug && this.showSources) {
        this.context.result.next({ type: 'debug', content: result.debug });
      }

      return JSON.stringify(result.files, undefined, 2);
    } catch (err) {
      const errorMessage = 'Failed to execute file search';
      this.logger.error(errorMessage, err);
      this.context.result.next({ type: 'debug', content: errorMessage });
      return 'Query failed. There was an internal error fetching the required data. Please report an error to the user.';
    }
  }
}

export type FilesExtensionConfiguration = ExtensionConfiguration & {
  description: string;
  bucket: number;
  take: number;
  showSources: boolean;
};
