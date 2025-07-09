import { fetchEventSource } from '@microsoft/fetch-event-source';
import { Observable, ReplaySubject } from 'rxjs';
import Cookies from 'universal-cookie';
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
  UsagesApi,
  UsersApi,
} from 'src/api/generated';
import { useTransientNavigate } from 'src/hooks';
import { i18next } from 'src/texts/i18n';
import { PromptsApi as CustomPromptsApi } from './prompts';
import { TaskCategoriesApi } from './task-categories';
export * from './generated';
export * from './task-categories';
// Note: Not exporting ./prompts to avoid conflict with generated PromptsApi

type TransientNavigateFn = ReturnType<typeof useTransientNavigate>;

const createAppClientMiddleware: (navigate: TransientNavigateFn) => Middleware = (navigate) => ({
  pre: async (context) => {
    context.init.credentials = 'include';
    context.init.headers = {
      ...context.init.headers,
      'Accept-Language': i18next.language,
    };
    return Promise.resolve();
  },
  post: async (context) => {
    if (context.response?.status === 401) {
      const secure = window.location.protocol === 'https:';
      const sameSite = secure ? 'none' : 'strict';
      const cookies = new Cookies(null, { path: '/', secure, sameSite });
      cookies.set('post-login-redirect', window.location.pathname);
      navigate('/login');
    }
    return Promise.resolve();
  },
});

// Simple singleton without Zustand
let appClientInstance: AppClient | undefined;

const initializeAppClient = (navigate: TransientNavigateFn): AppClient => {
  if (!appClientInstance) {
    const basePath = import.meta.env.VITE_SERVER_URL || '';
    const configuration = new Configuration({
      basePath,
    });
    const middleware = createAppClientMiddleware(navigate);
    appClientInstance = new AppClient(configuration, middleware);
  }

  return appClientInstance;
};

export function useApi() {
  const navigate = useTransientNavigate();
  return initializeAppClient(navigate);
}

export class AppClient {
  public readonly auth: AuthApi;
  public readonly conversations: ConversationApi;
  public readonly extensions: ExtensionsApi;
  public readonly files: FilesApi;
  public readonly prompts: CustomPromptsApi;
  public readonly taskCategories: TaskCategoriesApi;
  public readonly settings: SettingsApi;
  public readonly stream: StreamApi;
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

    this.prompts = new CustomPromptsApi(configuration).withMiddleware(middleware);

    this.taskCategories = new TaskCategoriesApi(configuration).withMiddleware(middleware);

    this.settings = new SettingsApi(configuration).withMiddleware(middleware);

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
