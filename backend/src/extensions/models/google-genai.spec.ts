import { GoogleGenAIModelExtension } from './google-genai';
import { modelExtensionTestSuite } from './model-test.base';

jest.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: jest.fn(() => () => 'mocked model'),
}));
jest.mock('ai', () => ({
  generateText: jest.fn(() => () => 'test output'),
}));

describe('GoogleGenAIModelExtension', () => modelExtensionTestSuite(GoogleGenAIModelExtension));
