import { BedrockModelExtension } from './bedrock-ai';
import { modelExtensionTestSuite } from './model-test.base';

jest.mock('@ai-sdk/amazon-bedrock', () => ({
  createAmazonBedrock: jest.fn(() => () => 'mocked model'),
}));
jest.mock('ai', () => ({
  generateText: jest.fn(() => () => 'test output'),
}));

const mockConfig = {
  model: 'test-bedrock-model',
  region: 'test-region',
  accessKeyId: 'test-access-key-id',
  secretAccessKey: 'test-secret-access-key',
};

describe('BedrockModelExtension', () => modelExtensionTestSuite(BedrockModelExtension, mockConfig));
