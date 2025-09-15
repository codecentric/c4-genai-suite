import { type BaseCallbackHandler, type CallbackHandlerMethods } from '@langchain/core/callbacks/base';
import { type BaseListChatMessageHistory } from '@langchain/core/chat_history';
import { type BaseChatModel, type BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import { type ChatPromptTemplate } from '@langchain/core/prompts';
import { type RunnableSequence } from '@langchain/core/runnables';
import { type StructuredToolInterface } from '@langchain/core/tools';
import { Subject } from 'rxjs';
import { ConfigurationModel, ExtensionArgument } from '../extensions';
import { UploadedFile } from '../files';
import { User } from '../users';

// Chat errors are exposed to the user.
export class ChatError extends Error {
  constructor(public readonly message: string) {
    super(message);
    this.name = 'ChatError';
  }
}

export type ConversationContext = Record<string, string>;

export type ExtensionUserArgumentValues = Record<string, any>;

export type ExtensionUserArguments = Record<string, ExtensionUserArgumentValues>;

export interface Conversation {
  readonly id: number;

  readonly name?: string;

  readonly isNameSetManually?: boolean;

  readonly rating?: ConversationRating;

  readonly createdAt: Date;

  // The chosen llm.
  readonly llm?: string;

  readonly configurationId: number;

  readonly context?: ConversationContext;

  readonly extensionUserArguments?: ExtensionUserArguments;
}

export interface ChatCache {
  // Gets a cache item.
  get<T>(key: string, args: any, resolver: () => Promise<T> | T, ttl?: number): Promise<T>;

  clean(): void;
}

export enum FormActionType {
  ACCEPT = 'accept',
  REJECT = 'reject',
  CANCEL = 'cancel',
}

export interface ChatUICallbackResult {
  action: FormActionType;
  data?: Record<string, any>;
}

export interface ChatUI {
  form(text: string, schema: ExtensionArgument): Promise<ChatUICallbackResult>;
}

export interface AgentArgument {
  llm: BaseChatModel<BaseChatModelCallOptions>;
  tools: StructuredToolInterface[];
  prompt: ChatPromptTemplate;
  streamRunnable?: boolean;
}

export interface MessagesHistory {
  addSources(externalExtensionId: string, sources: Source[]): void;
}

export interface ChatContext {
  // The abort controller.
  readonly abort: AbortController;

  // Tools this agent has access to.
  readonly tools: (StructuredToolInterface & { displayName?: string })[];

  // The input.
  readonly input: string;

  // The message to update.
  readonly editMessageId?: number;

  // The input files
  readonly files?: Pick<UploadedFile, 'id' | 'fileName'>[];

  // The result message.
  readonly result: Subject<StreamEvent>;

  // The cache for expensive values.
  readonly cache: ChatCache;

  // The system messages.
  readonly systemMessages: string[];

  // The deployment.
  readonly configuration: ConfigurationModel;

  // The ID of the conversion.
  readonly conversationId: number;

  // The context values.
  readonly context: ConversationContext;

  // The callbacks for the chain.
  readonly callbacks: (BaseCallbackHandler | CallbackHandlerMethods)[];

  // Configures the summary generation.
  summaryConfig?: { prompt: string; historyLength?: number };

  // Controls the chat user interface.
  ui: ChatUI;

  // The current user.
  user: User;

  // LLM to use as the agent.
  llms: Record<string, BaseChatModel<BaseChatModelCallOptions>>;

  agentFactory?: (args: AgentArgument) => Promise<RunnableSequence> | RunnableSequence;

  // The prompt to use, must have an input key.
  prompt?: ChatPromptTemplate;

  // The chosen LLM.
  llm?: string;

  // The optional token usage.
  tokenUsage?: TokenUsage;

  // The history of previous messages
  history?: BaseListChatMessageHistory & MessagesHistory;
}

export interface TokenUsage {
  // The consumed token.
  tokenCount: number;

  // The name of the llm.
  llm: string;

  // The name of the model.
  model: string;
}

export interface Message {
  // The ID to make updates.
  id: number;

  // The actual content.
  content: NormalizedMessageContents;

  // The type of the message.
  type: MessageType;

  // The debug records.
  debug?: string[];

  // The sources.
  sources?: Source[];

  // The running tools.
  tools?: string[];

  // The optional rating.
  rating?: MessageRating;

  logging?: string[];

  configurationId: number;
}

export type NormalizedMessageContentText = {
  type: 'text';
  text: string;
};

export type NormalizedMessageContentImageUrl = {
  type: 'image_url';
  image: { url: string };
};

export type NormalizedMessageContent = NormalizedMessageContentImageUrl | NormalizedMessageContentText;
export type NormalizedMessageContents = NormalizedMessageContent[];

export const CONVERSATION_RATINGS = ['good', 'bad', 'unrated'] as const;

export type ConversationRating = (typeof CONVERSATION_RATINGS)[number];

export const MESSAGE_RATINGS = [
  'lazy',
  'insufficient_style',
  'incorrect',
  'instructions_not_followed',
  'refused',
  'other',
] as const;

export type MessageRating = (typeof MESSAGE_RATINGS)[number];

export const MESSAGE_TYPES = ['ai', 'human'] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number];

export type StreamEvent =
  | StreamSummaryEvent
  | StreamCompletedEvent
  | StreamReasoningEvent
  | StreamReasoningEndEvent
  | StreamDebugEvent
  | StreamSourcesEvent
  | StreamLoggingEvent
  | StreamErrorEvent
  | StreamMessageSavedEvent
  | StreamTokenEvent
  | StreamToolEndEvent
  | StreamToolStartEvent
  | StreamUIEvent;

export interface StreamTokenEvent {
  type: 'chunk';
  content: NormalizedMessageContents;
}

export interface StreamErrorEvent {
  type: 'error';
  message: string;
}

export interface StreamToolStartEvent {
  type: 'tool_start';
  tool: ToolInfo;
}

export interface StreamToolEndEvent {
  type: 'tool_end';
  tool: ToolInfo;
}

export interface StreamMessageSavedEvent {
  type: 'saved';
  messageId: number;
  messageType: MessageType;
}

export interface StreamDebugEvent {
  type: 'debug';
  content: string;
}

export interface StreamSourcesEvent {
  type: 'sources';
  content: Source[];
}

export interface StreamLoggingEvent {
  type: 'logging';
  content: string;
}

export interface StreamUIEvent {
  type: 'ui';
  request: ChatUIRequest;
}

export interface StreamSummaryEvent {
  type: 'summary';
  content: string;
}

export interface StreamReasoningEvent {
  type: 'reasoning';
  content: string;
}

export interface StreamReasoningEndEvent {
  type: 'reasoning_end';
}

export interface StreamCompletedEvent {
  type: 'completed';
  metadata: ChatMetadata;
}

export interface ChatUIRequest {
  // The request ID to handle responses.
  id: string;

  // The text in markdown info.
  text: string;

  // The schema of the form
  schema?: ExtensionArgument;
}

export interface ChatMetadata {
  // The total token count.
  tokenCount: number;
}

export interface ToolInfo {
  // The display name of the tool.
  name: string;
}

export type ChatNextDelegate = (context: ChatContext) => Promise<any>;

export type GetContext = () => ChatContext;

export interface ChatMiddleware {
  order?: number;

  invoke(context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any>;
}

export const CHAT_MIDDLEWARES_TOKEN = 'CHAT_MIDDLEWARES';

export type Chunk = {
  uri?: string | null;
  content: string;
  pages?: number[] | null;
  score: number;
};

export type Document = {
  uri: string;
  name?: string | null;
  mimeType: string;
  size?: number | null;
  link?: string | null;
  downloadAvailable?: boolean;
};

export type Source = {
  title: string; // title of the source document
  chunk: Chunk;
  document?: Document | null;
  metadata?: Record<string, any> | null;
};

export type Sources = Source[];
