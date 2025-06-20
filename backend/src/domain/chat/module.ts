import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  BucketEntity,
  ConfigurationEntity,
  ConversationEntity,
  ConversationRepository,
  FileEntity,
  MessageEntity,
  MessageRepository,
  UsageEntity,
  UsageRepository,
  UserGroupEntity,
} from 'src/domain/database';
import { registerRepositoryForEntity } from '../database/typeorm.helper';
import { ChatCacheImpl } from './cache';
import { CHAT_MIDDLEWARES_TOKEN, ChatMiddleware } from './interfaces';
import {
  CheckUsageMiddleware,
  ChooseLllMiddleware,
  CompleteMiddleware,
  DefaultPromptMiddleware,
  ExceptionMiddleware,
  ExecuteMiddleware,
  ExecutorMiddleware,
  GetHistoryMiddleware,
  GetUserMiddleware,
  StorageUsageMiddleware,
  SummarizeHistoryMiddleware,
  UIMiddleware,
} from './middlewares';
import { CallbackService } from './services/callback-service';
import {
  DeleteConversationHandler,
  DeleteConversationsHandler,
  DuplicateConversationHandler,
  GetConversationHandler,
  GetConversationsHandler,
  GetDocumentContentHandler,
  GetHistoryHandler,
  GetMessagesCountHandler,
  GetRatingsHandler,
  GetUsageHandler,
  GetUsersCountHandler,
  RateMessageHandler,
  SendMessageHandler,
  StartConversationHandler,
  UpdateConversationHandler,
} from './use-cases';

@Module({
  imports: [
    ConfigModule,
    CqrsModule,
    TypeOrmModule.forFeature([
      ConversationEntity,
      ConfigurationEntity,
      MessageEntity,
      UsageEntity,
      UserGroupEntity,
      BucketEntity,
      FileEntity,
    ]),
  ],
  exports: [CallbackService],
  providers: [
    ChatCacheImpl,
    CallbackService,
    CheckUsageMiddleware,
    ChooseLllMiddleware,
    CompleteMiddleware,
    DefaultPromptMiddleware,
    DeleteConversationHandler,
    DeleteConversationsHandler,
    DuplicateConversationHandler,
    ExceptionMiddleware,
    ExecuteMiddleware,
    ExecutorMiddleware,
    GetConversationHandler,
    GetConversationsHandler,
    GetDocumentContentHandler,
    GetHistoryHandler,
    GetHistoryMiddleware,
    GetRatingsHandler,
    GetMessagesCountHandler,
    GetUsageHandler,
    GetUserMiddleware,
    GetUsersCountHandler,
    RateMessageHandler,
    SendMessageHandler,
    StartConversationHandler,
    StorageUsageMiddleware,
    SummarizeHistoryMiddleware,
    UIMiddleware,
    UpdateConversationHandler,
    registerRepositoryForEntity(MessageRepository, MessageEntity),
    registerRepositoryForEntity(ConversationRepository, ConversationEntity),
    registerRepositoryForEntity(UsageRepository, UsageEntity),
    {
      provide: CHAT_MIDDLEWARES_TOKEN,
      useFactory: (...args: ChatMiddleware[]) => {
        return [...args];
      },
      inject: [
        CheckUsageMiddleware,
        ChooseLllMiddleware,
        CompleteMiddleware,
        DefaultPromptMiddleware,
        ExceptionMiddleware,
        ExecuteMiddleware,
        ExecutorMiddleware,
        GetHistoryMiddleware,
        GetUserMiddleware,
        StorageUsageMiddleware,
        SummarizeHistoryMiddleware,
        UIMiddleware,
      ],
    },
  ],
})
export class ChatModule {}
