import * as fs from 'fs';
import * as path from 'path';
import { Logger, Module, Type } from '@nestjs/common';
import { DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/domain/auth/module';
import { BucketEntity, CacheEntity, FileEntity } from 'src/domain/database';
import { Extension } from 'src/domain/extensions';
import { AzureOpenAIModelExtension } from './models/azure-open-ai';
import { AzureOpenAIReasoningModelExtension } from './models/azure-open-ai-reasoning';
import { BedrockModelExtension } from './models/bedrock-ai';
import { GoogleGenAIModelExtension } from './models/google-genai';
import { MistralModelExtension } from './models/mistral';
import { OllamaModelExtension } from './models/ollama';
import { OpenAIModelExtension } from './models/open-ai';
import { OpenAICompatibleModelExtension } from './models/open-ai-compatible';
import { VertexAIModelExtension } from './models/vertex-al';
import { CustomPromptExtension } from './other/custom';
import { HubPromptExtension } from './other/hub';
import { LangfuseExtension } from './other/langfuse';
import { SpeechToTextExtension } from './other/speech-to-text';
import { SummaryPromptExtension } from './other/summary';
import { Always42Extension } from './tools/always-42';
import { AzureAISearchExtension } from './tools/azure-ai-search';
import { AzureDallEExtension } from './tools/azure-dall-e';
import { BingWebSearchExtension } from './tools/bing-web-search';
import { BraveWebSearchExtension } from './tools/brave-web-search';
import { CalculatorExtension } from './tools/calculator';
import { ConfirmExtension } from './tools/confirm';
import { DallEExtension } from './tools/dall-e';
import { DuckduckgoWebSearchExtension } from './tools/duckduckgo-web-search';
import { FilesExtension } from './tools/files';
import { FilesConversationExtension } from './tools/files-conversation';
import { FilesVisionExtension } from './tools/files-vision';
import { MCPToolsExtension } from './tools/mcp-tools';
import { OpenApiExtension } from './tools/open-api';
import { ContextExtension } from './tools/show-context';
import { SimpleInputExtension } from './tools/simple-input';
import { UserArgsExtension } from './tools/user-args';
import { WholeFilesExtension } from './tools/whole-files-conversation';

const extensionClassSuffix = 'Extension';

function getDynamicExtensionModules() {
  const extensionModulesFolder = path.join(__dirname, '..', '..', 'node_modules', '@c4', 'extensions');
  if (fs.existsSync(extensionModulesFolder)) {
    const entries = fs.readdirSync(extensionModulesFolder, { withFileTypes: true });

    return entries
      .filter((x) => x.isDirectory())
      .map((entry) => {
        copyDirFiles(path.join(extensionModulesFolder, entry.name, 'i18n'), path.join(__dirname, '..', 'localization', 'i18n'));
        return `@c4/extensions/${entry.name}`;
      });
  }

  return [];
}

function copyDirFiles(source: string, target: string) {
  if (!fs.existsSync(source)) {
    return;
  }

  const entries = fs.readdirSync(source, { withFileTypes: true });
  entries.forEach((entry) => {
    if (entry.isDirectory()) {
      copyDirFiles(path.join(source, entry.name), path.join(target, entry.name));
    } else {
      fs.cpSync(path.join(source, entry.name), path.join(target, entry.name));
    }
  });
}

async function getDynamicExtensionProviders(logger: Logger): Promise<Type<Extension>[]> {
  const providers: Type<Extension>[] = [];

  const extensionModules = getDynamicExtensionModules();

  for (const extensionModule of extensionModules) {
    try {
      const module = (await import(extensionModule)) as Record<string, Type<Extension>>;
      const extensionKey = Object.keys(module).find((x) => x.endsWith(extensionClassSuffix));
      if (extensionKey) {
        const extension = module[extensionKey];
        providers.push(extension);
        logger.log(`Loaded extension: ${extensionKey}`);
      }
    } catch (err) {
      logger.error(`Error loading extension ${extensionModule}`, err);
    }
  }

  return providers;
}

@Module({})
export class ExtensionLibraryModule {
  static async register(): Promise<DynamicModule> {
    const dynamicProviders = await getDynamicExtensionProviders(new Logger(ExtensionLibraryModule.name));
    return {
      module: ExtensionLibraryModule,
      imports: [ConfigModule, AuthModule, CqrsModule, TypeOrmModule.forFeature([CacheEntity, BucketEntity, FileEntity])],
      providers: [
        ...dynamicProviders,
        Always42Extension,
        AzureAISearchExtension,
        AzureDallEExtension,
        AzureOpenAIModelExtension,
        AzureOpenAIReasoningModelExtension,
        BedrockModelExtension,
        BingWebSearchExtension,
        BraveWebSearchExtension,
        CalculatorExtension,
        ConfirmExtension,
        ContextExtension,
        CustomPromptExtension,
        DallEExtension,
        DuckduckgoWebSearchExtension,
        FilesConversationExtension,
        FilesExtension,
        FilesVisionExtension,
        GoogleGenAIModelExtension,
        HubPromptExtension,
        LangfuseExtension,
        MCPToolsExtension,
        MistralModelExtension,
        OllamaModelExtension,
        OpenAICompatibleModelExtension,
        OpenAIModelExtension,
        OpenApiExtension,
        SimpleInputExtension,
        SpeechToTextExtension,
        SummaryPromptExtension,
        UserArgsExtension,
        VertexAIModelExtension,
        WholeFilesExtension,
      ],
    };
  }
}
