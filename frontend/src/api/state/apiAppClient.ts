import { fetchEventSource } from '@microsoft/fetch-event-source';
import { Observable } from 'rxjs';
import {
  AuditLogsApi,
  AuthApi,
  Configuration,
  ConversationApi,
  ExtensionsApi,
  FilesApi,
  Middleware,
  SendMessageDto,
  SettingsApi,
  StreamEventDto,
  TranscriptionApi,
  UsagesApi,
  UsersApi,
} from 'src/api/generated';
import { useTransientNavigate } from 'src/hooks';
import { i18next } from 'src/texts/i18n';
import { useAppClientStore } from './zustand/appClientStore';

export function useApi() {
  const navigate = useTransientNavigate();
  return useAppClientStore((state) => state.getAppClient(navigate));
}

export type CancelledStreamEventDto = {
  type: 'cancelled';
  content: string;
  messageId?: number;
  metadata: {
    tokenCount: number;
  };
};

export type ChatStreamEventDto = StreamEventDto | CancelledStreamEventDto;

export class AppClient {
  public readonly auditLogs: AuditLogsApi;
  public readonly auth: AuthApi;
  public readonly conversations: ConversationApi;
  public readonly extensions: ExtensionsApi;
  public readonly files: FilesApi;
  public readonly settings: SettingsApi;
  public readonly stream: StreamApi;
  public readonly transcription: TranscriptionApi;
  public readonly usages: UsagesApi;
  public readonly users: UsersApi;

  public get url() {
    return this.configuration.basePath;
  }

  constructor(
    readonly configuration: Configuration,
    middleware: Middleware,
  ) {
    this.stream = new StreamApi(configuration);

    this.auditLogs = new AuditLogsApi(configuration).withMiddleware(middleware);

    this.auth = new AuthApi(configuration).withMiddleware(middleware);

    this.conversations = new ConversationApi(configuration).withMiddleware(middleware);

    this.extensions = new ExtensionsApi(configuration).withMiddleware(middleware);

    this.files = new FilesApi(configuration).withMiddleware(middleware);

    this.settings = new SettingsApi(configuration).withMiddleware(middleware);

    this.transcription = new TranscriptionApi(configuration).withMiddleware(middleware);

    this.usages = new UsagesApi(configuration).withMiddleware(middleware);

    this.users = new UsersApi(configuration).withMiddleware(middleware);
  }
}

class StreamApi {
  constructor(private readonly configuration: Configuration) {}

  async cancelPrompt(conversationId: number): Promise<void> {
    const path = `${this.configuration.basePath}/api/conversations/${conversationId}/messages/cancel`;
    await fetch(path, {
      method: 'POST',
      keepalive: true,
      credentials: 'include',
      headers: {
        'Accept-Language': i18next.language,
      },
    });
  }

  streamPrompt(conversationId: number, message: SendMessageDto, messageId?: number): Observable<ChatStreamEventDto> {
    const basePath = `${this.configuration.basePath}/api/conversations/${conversationId}`;
    const path = messageId ? `${basePath}/messages/${messageId}/sse` : `${basePath}/messages/sse`;
    const method = messageId ? 'PUT' : 'POST';

    return new Observable<ChatStreamEventDto>((subscriber) => {
      const abortController = new AbortController();
      let streamClosed = false;

      fetchEventSource(path, {
        method: method,
        body: JSON.stringify(message),
        openWhenHidden: true,
        signal: abortController.signal,
        credentials: 'include',
        headers: {
          'Accept-Language': i18next.language,
          'Content-Type': 'application/json',
        },
        onmessage(msg) {
          const data = JSON.parse(msg.data) as ChatStreamEventDto;
          subscriber.next(data);
        },
        onerror(err) {
          if (abortController.signal.aborted) {
            streamClosed = true;
            subscriber.complete();
            return;
          }

          subscriber.error(err);
          throw err;
        },
        onclose() {
          streamClosed = true;
          subscriber.complete();
        },
      }).catch((err) => {
        if (abortController.signal.aborted) {
          streamClosed = true;
          subscriber.complete();
          return;
        }
        subscriber.error(err);
      });

      return () => {
        const shouldCancelBackend = !streamClosed;
        if (shouldCancelBackend) {
          void this.cancelPrompt(conversationId).catch(() => undefined);
        }
        abortController.abort();
      };
    });
  }
}
