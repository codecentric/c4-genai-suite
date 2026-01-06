import { modelExtensionTestSuite } from './model-test.base';
import { OllamaModelExtension } from './ollama';

jest.mock('ollama-ai-provider-v2', () => ({
  createOllama: jest.fn(() => () => 'mocked model'),
}));
jest.mock('ai', () => ({
  generateText: jest.fn(() => () => 'test output'),
}));

const mockConfig = {
  endpoint: 'test-endpoint',
  modelName: 'test-model',
};

describe('OllamaModelExtension', () => modelExtensionTestSuite(OllamaModelExtension, mockConfig));
