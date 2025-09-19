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

describe('OpenAIModelExtension', () => modelExtensionTestSuite(AzureOpenAIModelExtension));
