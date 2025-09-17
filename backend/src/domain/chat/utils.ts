import { NormalizedMessageContents } from './interfaces';

export function normalizedMessageContent(source: string): NormalizedMessageContents {
  const result: NormalizedMessageContents = [];

  if (source.length > 0) {
    result.push({ type: 'text', text: source });
  }

  return result;
}
