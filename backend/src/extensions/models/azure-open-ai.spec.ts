import { AzureOpenAIModelExtension } from './azure-open-ai';
import { modelExtensionTestSuite } from './model-test.base';

jest.mock('@ai-sdk/azure', () => ({
  createAzure: jest.fn(() => ({
    responses: jest.fn(() => () => 'mocked model'),
  })),
}));

jest.mock('ai', () => ({
  generateText: jest.fn(() => () => 'test output'),
}));

const mockConfig = {
  modelName: 'test-model',
  apiKey: 'test-api-key',
  deploymentName: 'test-deployment',
  instanceName: 'test-instance',
};

describe('OpenAIModelExtension', () => modelExtensionTestSuite(AzureOpenAIModelExtension, mockConfig));
