import { MistralModelExtension } from './mistral';
import { modelExtensionTestSuite } from './model-test.base';

jest.mock('@ai-sdk/mistral', () => ({
  createMistral: jest.fn(() => () => 'mocked model'),
}));
jest.mock('ai', () => ({
  generateText: jest.fn(() => () => 'test output'),
}));

const mockConfig = {
  apiKey: 'test-api-key',
  modelName: 'test-model',
};

describe('MistralModelExtension', () => modelExtensionTestSuite(MistralModelExtension, mockConfig));
