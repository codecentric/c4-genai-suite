import { MistralModelExtension } from './mistral';
import { modelExtensionTestSuite } from './model-test.base';

jest.mock('@ai-sdk/mistral', () => ({
  createMistral: jest.fn(() => () => 'mocked model'),
}));
jest.mock('ai', () => ({
  generateText: jest.fn(() => () => 'test output'),
}));

describe('MistralModelExtension', () => modelExtensionTestSuite(MistralModelExtension));
