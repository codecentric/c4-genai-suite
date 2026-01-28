import { I18nService } from '../../localization/i18n.service';
import { AzureTranscribeExtension } from './azure-transcribe';

describe('AzureTranscribeExtension', () => {
  let extension: AzureTranscribeExtension;

  const i18n = {
    t: (val: string) => val,
  } as unknown as I18nService;

  beforeEach(() => {
    extension = new AzureTranscribeExtension(i18n);
  });

  describe('spec', () => {
    it('should have correct name', () => {
      expect(extension.spec.name).toBe('transcribe');
    });

    it('should have group set to speech-to-text', () => {
      expect(extension.spec.group).toBe('speech-to-text');
    });

    it('should have type set to other', () => {
      expect(extension.spec.type).toBe('other');
    });

    it('should have required arguments', () => {
      expect(extension.spec.arguments).toHaveProperty('apiKey');
      expect(extension.spec.arguments).toHaveProperty('instanceName');
      expect(extension.spec.arguments).toHaveProperty('deploymentName');
      expect(extension.spec.arguments).toHaveProperty('apiVersion');
    });

    it('should have apiVersion as select with examples', () => {
      const apiVersionArg = extension.spec.arguments.apiVersion;
      expect(apiVersionArg).toMatchObject({
        required: true,
        format: 'select',
        examples: ['2024-06-01', '2025-03-01-preview'],
      });
    });

    it('should have password format for apiKey', () => {
      const apiKeyArg = extension.spec.arguments.apiKey;
      expect(apiKeyArg).toMatchObject({
        format: 'password',
        required: true,
      });
    });
  });
});
