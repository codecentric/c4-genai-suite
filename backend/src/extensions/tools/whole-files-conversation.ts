import { StructuredTool } from '@langchain/core/tools';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { z } from 'zod';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext } from 'src/domain/chat';
import { Extension, ExtensionConfiguration, ExtensionEntity, ExtensionSpec } from 'src/domain/extensions';
import { User } from 'src/domain/users';
import { GetFiles, GetFilesResponse } from '../../domain/files';
import { FileProcessResult } from '../../domain/files/use-cases/generated';
import { I18nService } from '../../localization/i18n.service';

@Extension()
export class WholeFilesExtension implements Extension<WholeFilesExtensionConfiguration> {
  constructor(
    @Inject(forwardRef(() => QueryBus))
    protected readonly queryBus: QueryBus,
    protected readonly i18n: I18nService,
  ) {}

  get fixedValues() {
    return { createEmbeddings: false };
  }

  get spec(): ExtensionSpec {
    return {
      name: 'files-whole',
      group: 'files',
      groupWhitelist: ['files-42', 'files-vision'],
      title: this.i18n.t('texts.extensions.whole-files.title'),
      logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" id="Layer_1"><defs><linearGradient id="gradient1" gradientUnits="userSpaceOnUse" x1="39.446" y1="801.241" x2="182.915" y2="944.694" gradientTransform="matrix(5.2695 0 0 -5.2695 -85.79 5100.133)"><stop offset=".05" stop-color="#07b0d3"/><stop offset=".229" stop-color="#4bb8cf"/><stop offset=".744" stop-color="#93ccb9"/><stop offset="1" stop-color="#a8d2af"/></linearGradient></defs><path d="M25.69,2.9H11.93a2.7,2.7,0,0,0-2-.9A2.74,2.74,0,0,0,7.18,4.74v8.11a.94.94,0,0,0,1.87,0V4.74a.87.87,0,0,1,1.74,0v7.2a2.68,2.68,0,1,1-5.35,0V4.74a.93.93,0,1,0-1.86,0v7.2a4.52,4.52,0,0,0,4.05,4.49V27.26A2.74,2.74,0,0,0,10.37,30H25.69a2.74,2.74,0,0,0,2.73-2.74V5.64A2.74,2.74,0,0,0,25.69,2.9Zm.87,24.36a.87.87,0,0,1-.87.87H10.37a.87.87,0,0,1-.87-.87v-11a4.51,4.51,0,0,0,3.05-3.36H23.66a.94.94,0,0,0,0-1.87h-11V4.77h13a.87.87,0,0,1,.87.87Z" fill="url(#gradient1)"/><path d="M23.66,15.52H12.4a.93.93,0,1,0,0,1.86H23.66a.93.93,0,0,0,0-1.86Z" fill="url(#gradient1)"/><path d="M23.66,20H12.4a.94.94,0,1,0,0,1.87H23.66a.94.94,0,0,0,0-1.87Z" fill="url(#gradient1)"/></svg>',
      description: this.i18n.t('texts.extensions.whole-files.description'),
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
          minimum: 1,
          default: 3,
          multipleOf: 1,
        },
      },
    };
  }

  private createContent(fileContent: FileProcessResult) {
    const instructions =
      'All results are enclosed within <sources> and </sources> tags. Each source is represented by a <source> tag, which may include metadata such as filename, page number, or section title.\nWhen answering, reference the most relevant parts of the sources. Use the filename (not the source ID) in your citations, and include page numbers, a section title or timestamps when available. Make your citations clear and easy for casual users to understand.\n\n';
    let content = instructions + '<sources>';
    for (const file of fileContent.chunks) {
      let openTag = '<source';
      for (const [key, value] of Object.entries(file.metadata)) {
        if (value === null) {
          continue;
        }
        openTag += ` ${key}="${value}"`;
      }
      openTag += '>';
      content += openTag + file.content + '</source>';
    }
    content += '</sources>';

    return content;
  }

  private decode(content: string, mimeType: string): string | null {
    if (mimeType === 'application/reis+processed') {
      const data = JSON.parse(atob(content)) as FileProcessResult;
      return this.createContent(data);
    }

    return content;
  }

  getMiddlewares(user: User, extension: ExtensionEntity<WholeFilesExtensionConfiguration>): Promise<ChatMiddleware[]> {
    const middleware = {
      invoke: async (context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> => {
        const matchingFiles: GetFilesResponse = await this.queryBus.execute(
          new GetFiles({
            user,
            bucketIdOrType: 'conversation',
            page: 0,
            pageSize: context.files?.length ?? extension.values.maxFiles,
            conversationId: context.conversationId,
            files: context.files ? context.files.map((x) => x.id) : undefined,
            withContent: true,
          }),
        );

        const fileContent = matchingFiles.files
          .flatMap((x) => x.content)
          .reduce((prev, curr) => {
            return curr?.buffer ? `${prev}${this.decode(curr.buffer, curr.type)}` : prev;
          }, '');

        let description =
          'Use this tool to retrieve the complete contents of files uploaded by the user in this conversation.\nUse it if the user searches for things or needs specific information.\n\n';

        description += [
          '* Use this tool in combination with other file-related tools, as each may access different files',
          '* Use this tool whenever the user refers to any external source (e.g., document, file, recording, video)',
          '* When unsure, prefer to use the tool to ensure accuracy and completeness',
          '* Do not guess file names or contents',
          '* Do not link to the files',
          "* If the information returned by this tool is irrelevant to the user's query, ignore it",
          '* Users can upload files to this conversation using the paperclip symbol',
        ].join('\n');
        description += '\n\n';

        let enrichment = 'Currently no complete file is uploaded by the user. If you expect one, ask the user to upload a file.';

        if (fileContent) {
          enrichment = `The user has uploaded ${matchingFiles.files?.length} file(s).`;

          const fileList = matchingFiles.files?.map((x) => `* ${x.fileName}`).join('\n');

          // Ensure the length does not exceed the 1024 character limit for tool descriptions
          if ((description + enrichment + fileList).length < 1024) {
            enrichment += `\n\n${fileList}`;
          }
        }

        context.tools.push(new InternalTool(description + enrichment, this.queryBus, context, extension.externalId, fileContent));
        return next(context);
      },
    };

    return Promise.resolve([middleware]);
  }
}

class InternalTool extends StructuredTool {
  readonly name: string;
  readonly displayName = 'Complete Files';
  private readonly logger = new Logger(`${WholeFilesExtension.name}$${InternalTool.name}`);

  get lc_id() {
    return [...this.lc_namespace, this.name];
  }

  readonly schema = z.object({});

  constructor(
    public readonly description: string,
    private readonly queryBus: QueryBus,
    private readonly context: ChatContext,
    extensionExternalId: string,
    private readonly fileContent: string,
  ) {
    super();

    this.name = extensionExternalId;
  }

  protected _call(): Promise<string> {
    return Promise.resolve(this.fileContent);
  }
}

type WholeFilesExtensionConfiguration = ExtensionConfiguration & {
  bucket: number;
  maxFiles: number;
};
