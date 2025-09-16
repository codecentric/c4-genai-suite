import { modelExtensionTestSuite } from './model-test.base';
import { OpenAIModelExtension } from './open-ai';

jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(() => () => 'mocked model'),
}));
jest.mock('ai', () => ({
  generateText: jest.fn(() => () => 'test output'),
}));

describe('OpenAIModelExtension', () => modelExtensionTestSuite(OpenAIModelExtension));
