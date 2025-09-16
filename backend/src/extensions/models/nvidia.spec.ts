import { modelExtensionTestSuite } from './model-test.base';
import { NvidiaModelExtension } from './nvidia';

jest.mock('@ai-sdk/openai-compatible', () => ({
  createOpenAICompatible: jest.fn(() => () => 'mocked model'),
}));
jest.mock('ai', () => ({
  generateText: jest.fn(() => () => 'test output'),
}));

describe('NvidiaModelExtension', () => modelExtensionTestSuite(NvidiaModelExtension));
