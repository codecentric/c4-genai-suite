import { LanguageModelV3 } from '@ai-sdk/provider';
import { extractReasoningMiddleware, wrapLanguageModel } from 'ai';

export const wrapWithReasoningTagName = (model: LanguageModelV3, reasoningTagName?: string) =>
  reasoningTagName
    ? wrapLanguageModel({
        model,
        middleware: extractReasoningMiddleware({ tagName: reasoningTagName }),
      })
    : model;
