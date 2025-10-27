import { modelExtensionTestSuite } from './model-test.base';
import { OpenAIModelExtension } from './open-ai';

jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(() => ({
    responses: jest.fn(() => () => 'mocked model'),
  })),
}));
jest.mock('ai', () => ({
  generateText: jest.fn(() => () => 'test output'),
}));

const mockConfig = {
  apiKey: 'test-api-key',
  modelName: 'test-model',
};

describe('OpenAIModelExtension', () => modelExtensionTestSuite(OpenAIModelExtension, mockConfig));
