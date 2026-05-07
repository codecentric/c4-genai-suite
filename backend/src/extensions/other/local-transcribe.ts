import { ChatMiddleware } from '../../domain/chat';
import { Extension, ExtensionConfiguration, ExtensionSpec } from '../../domain/extensions';
import { User } from '../../domain/users';
import { I18nService } from '../../localization/i18n.service';

@Extension()
export class LocalTranscribeExtension implements Extension<LocalTranscribeConfiguration> {
  constructor(private readonly i18n: I18nService) {}

  get spec(): ExtensionSpec {
    return {
      name: 'transcribe-local',
      group: 'speech-to-text',
      title: this.i18n.t('texts.extensions.localTranscribe.title'),
      logo: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#4A90D9" d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4zM9 5a3 3 0 1 1 6 0v6a3 3 0 1 1-6 0V5z"/><path fill="#4A90D9" d="M5.5 10.5a.75.75 0 0 1 .75.75A5.75 5.75 0 0 0 12 17a5.75 5.75 0 0 0 5.75-5.75.75.75 0 0 1 1.5 0A7.25 7.25 0 0 1 12.75 18.4v2.85h2.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5h2.5V18.4A7.25 7.25 0 0 1 4.75 11.25a.75.75 0 0 1 .75-.75z"/><path fill="#27AE60" d="M16.5 14.5v4a1.5 1.5 0 0 0 3 0v-4a.5.5 0 0 1 .15-.35l.35-.35a1.5 1.5 0 0 0 .5-1.12V12a1.5 1.5 0 0 0-3 0v.68a1.5 1.5 0 0 0 .5 1.12l.35.35a.5.5 0 0 1 .15.35z"/><path fill="#27AE60" d="M18 10a3 3 0 0 0-3 3v.68c0 .26.07.52.2.74l.35.53c.1.15.15.33.15.5v3.05a3 3 0 0 0 6 0v-3.05c0-.17.05-.35.15-.5l.35-.53c.13-.22.2-.48.2-.74V13a3 3 0 0 0-3-3zm-1.5 3a1.5 1.5 0 0 1 3 0v.68a.5.5 0 0 1-.07.25l-.35.53a2 2 0 0 0-.58 1.41v3.05a1.5 1.5 0 0 1-3 0v-3.05a2 2 0 0 0-.58-1.41l-.35-.53a.5.5 0 0 1-.07-.25V13z" opacity=".3"/></svg>',
      description: this.i18n.t('texts.extensions.localTranscribe.description'),
      type: 'other',
      arguments: {
        defaultLanguage: {
          type: 'string',
          title: this.i18n.t('texts.extensions.localTranscribe.defaultLanguage'),
          required: true,
          format: 'select',
          examples: ['de', 'en'],
          default: 'de',
        },
      },
    };
  }

  getMiddlewares(_user: User): Promise<ChatMiddleware[]> {
    return Promise.resolve([]);
  }
}

export type LocalTranscribeConfiguration = ExtensionConfiguration & {
  defaultLanguage: 'de' | 'en';
};
