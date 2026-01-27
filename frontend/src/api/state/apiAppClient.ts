import { fetchEventSource } from '@microsoft/fetch-event-source';
import { Observable, ReplaySubject } from 'rxjs';
import {
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

export class AppClient {
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

  streamPrompt(conversationId: number, message: SendMessageDto, messageId?: number): Observable<StreamEventDto> {
    const replaySubject = new ReplaySubject<StreamEventDto>();

    const basePath = `${this.configuration.basePath}/api/conversations/${conversationId}`;
    const path = messageId ? `${basePath}/messages/${messageId}/sse` : `${basePath}/messages/sse`;
    const method = messageId ? 'PUT' : 'POST';

    const observable = new Observable<StreamEventDto>((subscriber) => {
      fetchEventSource(path, {
        method: method,
        body: JSON.stringify(message),
        openWhenHidden: true,
        credentials: 'include',
        headers: {
          'Accept-Language': i18next.language,
          'Content-Type': 'application/json',
        },
        onmessage(msg) {
          const data = JSON.parse(msg.data) as StreamEventDto;
          subscriber.next(data);
        },
        onerror(err) {
          try {
            subscriber.error(err);
          } finally {
            subscriber.complete();
          }

          throw err;
        },
        onclose() {
          subscriber.complete();
        },
      }).catch((err) => {
        subscriber.error(err);
        subscriber.complete();
      });
    });
    observable.subscribe(replaySubject);
    return replaySubject;
  }
}
