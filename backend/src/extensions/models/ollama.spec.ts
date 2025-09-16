import { modelExtensionTestSuite } from './model-test.base';
import { OllamaModelExtension } from './ollama';

jest.mock('ollama-ai-provider-v2', () => ({
  createOllama: jest.fn(() => () => 'mocked model'),
}));
jest.mock('ai', () => ({
  generateText: jest.fn(() => () => 'test output'),
}));

describe('OllamaModelExtension', () => modelExtensionTestSuite(OllamaModelExtension));
