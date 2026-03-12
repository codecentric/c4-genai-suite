import { ConfigurationModel } from '../interfaces';
import { buildConfigurationSnapshot } from './utils';

function makeConfiguration(overrides: Partial<ConfigurationModel> = {}): ConfigurationModel {
  return {
    id: 42,
    name: 'Test Configuration',
    description: 'A test configuration',
    enabled: true,
    agentName: 'Test Agent',
    chatFooter: 'Footer text',
    chatSuggestions: [],
    executorEndpoint: 'https://executor.example.com',
    executorHeaders: undefined,
    userGroupIds: ['group-1'],
    ...overrides,
  };
}

describe('buildConfigurationSnapshot', () => {
  describe('executorHeaders redaction', () => {
    it('does not include executorHeaders in the snapshot when headers are set', () => {
      const snapshot = buildConfigurationSnapshot(makeConfiguration({ executorHeaders: 'Authorization=Bearer secret-token' }));

      expect(snapshot).not.toHaveProperty('executorHeaders');
    });

    it('does not include executorHeaders in the snapshot when headers are absent', () => {
      const snapshot = buildConfigurationSnapshot(makeConfiguration({ executorHeaders: undefined }));

      expect(snapshot).not.toHaveProperty('executorHeaders');
    });

    it('sets executorHeadersConfigured to true when executorHeaders are present', () => {
      const snapshot = buildConfigurationSnapshot(makeConfiguration({ executorHeaders: 'Authorization=Bearer secret-token' }));

      expect(snapshot.executorHeadersConfigured).toBe(true);
    });

    it('sets executorHeadersConfigured to false when executorHeaders are absent', () => {
      const snapshot = buildConfigurationSnapshot(makeConfiguration({ executorHeaders: undefined }));

      expect(snapshot.executorHeadersConfigured).toBe(false);
    });

    it('sets executorHeadersConfigured to false when executorHeaders is an empty string', () => {
      const snapshot = buildConfigurationSnapshot(makeConfiguration({ executorHeaders: '' }));

      expect(snapshot.executorHeadersConfigured).toBe(false);
    });
  });

  describe('non-sensitive field inclusion', () => {
    it('includes all non-sensitive configuration fields in the snapshot', () => {
      const configuration = makeConfiguration({ executorHeaders: 'Authorization=Bearer secret' });
      const snapshot = buildConfigurationSnapshot(configuration);

      expect(snapshot).toMatchObject({
        id: configuration.id,
        name: configuration.name,
        description: configuration.description,
        enabled: configuration.enabled,
        agentName: configuration.agentName,
        chatFooter: configuration.chatFooter,
        chatSuggestions: configuration.chatSuggestions,
        executorEndpoint: configuration.executorEndpoint,
        userGroupIds: configuration.userGroupIds,
      });
    });

    it('does not include extensions in the snapshot', () => {
      const snapshot = buildConfigurationSnapshot(makeConfiguration({ extensions: [] }));

      expect(snapshot).not.toHaveProperty('extensions');
    });
  });
});
