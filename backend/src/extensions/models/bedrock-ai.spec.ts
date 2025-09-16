import { BedrockModelExtension } from './bedrock-ai';
import { modelExtensionTestSuite } from './model-test.base';

jest.mock('@ai-sdk/amazon-bedrock', () => ({
  createAmazonBedrock: jest.fn(() => () => 'mocked model'),
}));
jest.mock('ai', () => ({
  generateText: jest.fn(() => () => 'test output'),
}));

describe('BedrockModelExtension', () => modelExtensionTestSuite(BedrockModelExtension));
