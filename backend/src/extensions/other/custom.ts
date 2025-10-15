import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext } from 'src/domain/chat';
import { Extension, ExtensionConfiguration, ExtensionEntity, ExtensionSpec } from 'src/domain/extensions';
import { User } from 'src/domain/users';
import { I18nService } from '../../localization/i18n.service';

@Extension()
export class CustomPromptExtension implements Extension<CustomPromptExtensionConfiguration> {
  constructor(private readonly i18n: I18nService) {}

  get spec(): ExtensionSpec {
    return {
      name: 'custom-prompt',
      title: this.i18n.t('texts.extensions.customPrompt.title'),
      logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"> <path id="path2" style="fill:#333333;fill-opacity:1" d="M 22.169922 5.65625 C 11.037774 5.65625 5.4707031 11.223321 5.4707031 22.355469 L 5.4707031 55.751953 C 5.4707031 66.884101 11.037774 72.449219 22.169922 72.449219 L 33.302734 72.449219 L 27.736328 89.148438 L 50 72.449219 L 77.830078 72.449219 C 88.962226 72.449219 94.529297 66.884101 94.529297 55.751953 L 94.529297 22.355469 C 94.529297 11.223321 88.962226 5.65625 77.830078 5.65625 L 22.169922 5.65625 z M 62.492188 18.212891 C 62.822411 18.212891 63.151263 18.340716 63.404297 18.59375 L 68.886719 24.074219 C 69.392787 24.580287 69.392787 25.394322 68.886719 25.900391 L 66.144531 28.640625 C 65.638463 29.146693 64.824428 29.146693 64.318359 28.640625 C 64.824428 29.146693 64.824428 29.962682 64.318359 30.46875 L 38.740234 56.046875 C 38.234166 56.552943 37.420131 56.552943 36.914062 56.046875 L 31.433594 50.564453 C 30.927526 50.058385 30.927526 49.244349 31.433594 48.738281 L 57.009766 23.160156 C 57.515834 22.654088 58.331822 22.654088 58.837891 23.160156 C 58.331822 22.654088 58.331822 21.840053 58.837891 21.333984 L 61.578125 18.59375 C 61.831159 18.340716 62.161964 18.212891 62.492188 18.212891 z M 31.058594 50.748047 L 36.685547 56.375 L 30.355469 57.078125 L 31.058594 50.748047 z " /> </svg>',
      description: this.i18n.t('texts.extensions.customPrompt.description'),
      type: 'other',
      arguments: {
        text: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.text'),
          format: 'textarea',
          required: false,
          description: this.i18n.t('texts.extensions.customPrompt.templateDescription'),
        },
      },
    };
  }

  getMiddlewares(_: User, extension: ExtensionEntity<CustomPromptExtensionConfiguration>): Promise<ChatMiddleware[]> {
    const middleware = {
      invoke: async (context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> => {
        const { text } = extension.values;
        if (text) {
          context.systemMessages.push(text);
        }

        return next(context);
      },
    };

    return Promise.resolve([middleware]);
  }
}

type CustomPromptExtensionConfiguration = ExtensionConfiguration & { text: string };
