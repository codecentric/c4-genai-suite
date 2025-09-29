import { Logger, NotFoundException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { In } from 'typeorm';
import { z } from 'zod';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext, NamedStructuredTool } from 'src/domain/chat';
import { Extension, ExtensionEntity, ExtensionSpec } from 'src/domain/extensions';
import { User } from 'src/domain/users';
import { FileEntity } from '../../domain/database';
import { Bucket, SearchFiles, SearchFilesResponse } from '../../domain/files';
import { FilesExtension, FilesExtensionConfiguration } from './files';

@Extension()
export class FilesConversationExtension extends FilesExtension<FilesConversationExtensionConfiguration> {
  override get spec(): ExtensionSpec {
    return {
      name: 'files-conversation',
      group: 'files',
      groupWhitelist: ['files-vision'],
      title: this.i18n.t('texts.extensions.filesInConversation.title'),
      logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" id="Layer_1"><defs><linearGradient id="gradient1" gradientUnits="userSpaceOnUse" x1="39.446" y1="801.241" x2="182.915" y2="944.694" gradientTransform="matrix(5.2695 0 0 -5.2695 -85.79 5100.133)"><stop offset=".05" stop-color="#07b0d3"/><stop offset=".229" stop-color="#4bb8cf"/><stop offset=".744" stop-color="#93ccb9"/><stop offset="1" stop-color="#a8d2af"/></linearGradient></defs><path d="M25.69,2.9H11.93a2.7,2.7,0,0,0-2-.9A2.74,2.74,0,0,0,7.18,4.74v8.11a.94.94,0,0,0,1.87,0V4.74a.87.87,0,0,1,1.74,0v7.2a2.68,2.68,0,1,1-5.35,0V4.74a.93.93,0,1,0-1.86,0v7.2a4.52,4.52,0,0,0,4.05,4.49V27.26A2.74,2.74,0,0,0,10.37,30H25.69a2.74,2.74,0,0,0,2.73-2.74V5.64A2.74,2.74,0,0,0,25.69,2.9Zm.87,24.36a.87.87,0,0,1-.87.87H10.37a.87.87,0,0,1-.87-.87v-11a4.51,4.51,0,0,0,3.05-3.36H23.66a.94.94,0,0,0,0-1.87h-11V4.77h13a.87.87,0,0,1,.87.87Z" fill="url(#gradient1)"/><path d="M23.66,15.52H12.4a.93.93,0,1,0,0,1.86H23.66a.93.93,0,0,0,0-1.86Z" fill="url(#gradient1)"/><path d="M23.66,20H12.4a.94.94,0,1,0,0,1.87H23.66a.94.94,0,0,0,0-1.87Z" fill="url(#gradient1)"/></svg>',
      description: this.i18n.t('texts.extensions.filesInConversation.description'),
      type: 'tool',
      arguments: {
        bucket: {
          type: 'number',
          title: this.i18n.t('texts.extensions.filesInConversation.bucket'),
          required: true,
          format: 'bucket',
          showInList: true,
        },
        maxFiles: {
          type: 'number',
          title: this.i18n.t('texts.extensions.filesInConversation.maxFiles'),
          description: this.i18n.t('texts.extensions.filesInConversation.maxFilesHint'),
          required: true,
          default: 10,
          maximum: 10,
        },
        showSources: {
          type: 'boolean',
          title: this.i18n.t('texts.extensions.filesInConversation.showSources'),
          description: this.i18n.t('texts.extensions.filesInConversation.showSourcesHint'),
          required: false,
          default: false,
        },
      },
    };
  }

  getMiddlewares(user: User, extension: ExtensionEntity<FilesConversationExtensionConfiguration>): Promise<ChatMiddleware[]> {
    const middleware = {
      invoke: async (context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> => {
        const { bucket, showSources } = extension.values;

        const bucketEntity = await this.buckets.findOneBy({ id: bucket });
        if (!bucketEntity) {
          throw new NotFoundException(`Bucket with id '${bucket}' was not found`);
        }

        const files = context.files?.length
          ? await this.files.findBy({ bucketId: bucket, id: In(context.files.map((x) => x.id)) })
          : [];

        let description =
          'Use this tool to semantically search the contents of files uploaded by the user in this conversation.\n\n';

        description += [
          '* Use this tool in combination with other file-related tools, as each may access different files',
          '* Use this tool whenever the user refers to any external source (e.g., document, file, recording, video)',
          '* When unsure, prefer to use the tool to ensure accuracy and completeness',
          '* Do not guess file names or contents; only search within the files uploaded by the user',
          '* Do not link to the files',
          '* This tool returns only relevant snippets (short extracts) from files, not full documents',
          '* If a user request cannot be fulfilled with a snippet (e.g., generating a summary), inform the user that this tool is not suitable for that purpose',
          "* If the information returned by this tool is irrelevant to the user's query, ignore it",
          '* Users can upload files to this conversation using the paperclip symbol',
        ].join('\n');
        description += '\n\n';

        let enrichment;
        if (files.length == 0) {
          enrichment = 'Currently the user did not upload any files, so there are no files available.';
        } else {
          enrichment = `The user has uploaded ${files.length} files in the chat.`;

          const fileList = files.map((file) => `* ${file.fileName}`).join('\n');

          // with the list of files it is easy to break the 1024 character limit for tool descriptions
          // we omit the list of files in that case
          if ((description + enrichment + fileList).length < 1024) {
            enrichment += `\n\n${fileList}`;
          }
        }

        context.tools.push(
          new InternalTool(
            description + enrichment,
            this.queryBus,
            context,
            bucketEntity,
            20,
            extension.externalId,
            showSources ?? false,
            files,
          ),
        );
        return next(context);
      },
    };
    return Promise.resolve([middleware]);
  }
}

class InternalTool extends NamedStructuredTool {
  readonly name: string;
  readonly displayName = 'Files in chat';
  private readonly logger = new Logger(`${FilesConversationExtension.name}$${InternalTool.name}`);

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
    private readonly showSources: boolean,
    private readonly files: FileEntity[],
  ) {
    super();
    this.name = extensionExternalId;
  }

  protected async _call(arg: z.infer<typeof this.schema>): Promise<string> {
    try {
      const fileIds = this.files.map((file) => file.id);

      const result: SearchFilesResponse = await this.queryBus.execute(
        new SearchFiles(this.bucket.id, arg.query, this.context.user, this.take, fileIds),
      );
      const sources = this.showSources ?? false;

      if (sources && result.sources) {
        this.context.history?.addSources(this.extensionExternalId, result.sources);
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

type FilesConversationExtensionConfiguration = FilesExtensionConfiguration & {
  bucket: number;
  maxFiles: number;
  showSources: boolean;
};
