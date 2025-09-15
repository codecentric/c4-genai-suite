import type { MessageContent, MessageContentComplex, MessageContentText } from '@langchain/core/messages';
import { AIMessageChunk } from '@langchain/core/messages';
import { ChatGenerationChunk } from '@langchain/core/outputs';
import { is, isArray, isString } from 'src/lib';
import { NormalizedMessageContents } from './interfaces';

function isTextItem(item: MessageContentComplex): item is MessageContentText {
  return !!(item as MessageContentText).text;
}

export function getReasoningContent(source: MessageContent | AIMessageChunk | ChatGenerationChunk): string | undefined {
  if (is(source, AIMessageChunk)) {
    return source.additional_kwargs?.['reasoning_content'] as string;
  }
}

export function normalizedMessageContent(
  source: MessageContent | AIMessageChunk | ChatGenerationChunk,
): NormalizedMessageContents {
  const result: NormalizedMessageContents = [];

  if (is(source, AIMessageChunk)) {
    source = source.content;
  } else if (is(source, ChatGenerationChunk)) {
    source = source.message.content;
  }

  if (isString(source)) {
    if (source.length > 0) {
      result.push({ type: 'text', text: source });
    }
  } else if (isArray(source)) {
    for (const item of source) {
      if (item.type === 'image_url') {
        if (isString(item.image_url)) {
          result.push({ type: 'image_url', image: { url: item.image_url } });
        } else {
          result.push({ type: 'image_url', image: { url: (item.image_url as { url: string }).url } });
        }
      } else {
        if (isTextItem(item)) {
          result.push({ type: 'text', text: item.text });
        }
      }
    }
  }

  return result;
}
