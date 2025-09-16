import { modelExtensionTestSuite } from './model-test.base';
import { VertexAIModelExtension } from './vertex-ai';

jest.mock('@ai-sdk/openai', () => ({
  createVertex: jest.fn(() => () => 'mocked model'),
}));
jest.mock('ai', () => ({
  generateText: jest.fn(() => () => 'test output'),
}));

describe('VertexAIModelExtension', () => modelExtensionTestSuite(VertexAIModelExtension));
