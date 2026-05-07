import { User } from '../../domain/users';
import { I18nService } from '../../localization/i18n.service';
import { LocalTranscribeExtension } from './local-transcribe';

describe('LocalTranscribeExtension', () => {
  let extension: LocalTranscribeExtension;

  const i18n = {
    t: (val: string) => val,
  } as unknown as I18nService;

  const mockUser: User = {
    id: 'test-user',
    name: 'Test User',
    email: 'test@example.com',
    userGroupIds: [],
  };

  beforeEach(() => {
    extension = new LocalTranscribeExtension(i18n);
  });

  describe('spec', () => {
    it('should have correct name', () => {
      expect(extension.spec.name).toBe('transcribe-local');
    });

    it('should have group set to speech-to-text', () => {
      expect(extension.spec.group).toBe('speech-to-text');
    });

    it('should have type set to other', () => {
      expect(extension.spec.type).toBe('other');
    });

    it('should have defaultLanguage as required select with de/en', () => {
      const arg = extension.spec.arguments.defaultLanguage;
      expect(arg).toMatchObject({
        type: 'string',
        required: true,
        format: 'select',
        examples: ['de', 'en'],
        default: 'de',
      });
    });

    it('should return empty middlewares', async () => {
      const middlewares = await extension.getMiddlewares(mockUser);
      expect(middlewares).toEqual([]);
    });
  });
});
