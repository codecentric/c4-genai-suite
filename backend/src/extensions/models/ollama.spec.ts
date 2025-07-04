import { modelExtensionTestSuite } from './model-test.base';
import { OllamaModelExtension } from './ollama';

const instance = {
  invoke: jest.fn().mockReturnThis(),
};

jest.mock('@langchain/openai', () => {
  return {
    ChatOpenAI: jest.fn().mockImplementation(() => {
      return instance;
    }),
  };
});

describe('OllamaModelExtension', () => modelExtensionTestSuite(OllamaModelExtension, instance));
