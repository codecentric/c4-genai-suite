import { GoogleGenAIModelExtension } from './google-genai';
import { modelExtensionTestSuite } from './model-test.base';

jest.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: jest.fn(() => () => 'mocked model'),
}));
jest.mock('ai', () => ({
  generateText: jest.fn(() => () => 'test output'),
}));

const mockConfig = {
  modelName: 'test-model',
  apiKey: 'test-api-key',
};

describe('GoogleGenAIModelExtension', () => modelExtensionTestSuite(GoogleGenAIModelExtension, mockConfig));
