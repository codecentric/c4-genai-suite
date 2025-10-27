import { modelExtensionTestSuite } from './model-test.base';
import { NvidiaModelExtension } from './nvidia';

jest.mock('@ai-sdk/openai-compatible', () => ({
  createOpenAICompatible: jest.fn(() => () => 'mocked model'),
}));
jest.mock('ai', () => ({
  generateText: jest.fn(() => () => 'test output'),
}));

const mockConfig = {
  apiKey: 'test-api-key',
  baseUrl: 'test-base-url',
  modelName: 'test-model',
};

describe('NvidiaModelExtension', () => modelExtensionTestSuite(NvidiaModelExtension, mockConfig));
