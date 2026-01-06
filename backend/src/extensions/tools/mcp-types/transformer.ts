import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Source } from 'src/domain/chat';
import { C4JsonType, convertC4JsonToSource, convertC4JsonToText } from './c4-json.type';

export type MCPText = { type: 'text'; text: string };
export type TransformedResponse = { content: MCPText[]; sources: Source[] };

export function transformMCPToolResponse(res: CallToolResult): TransformedResponse {
  const c4Content = res.content.filter((x) => x.type === 'resource' && x.resource.mimeType === 'application/x-c4-json-v1');
  if (!c4Content.length) {
    const content = res.content.filter((x) => x.type === 'text');
    return {
      content,
      sources: [],
    };
  }

  return c4Content.reduce(
    (prev, curr) => {
      if (curr.type !== 'resource') {
        return prev;
      }

      if (!('text' in curr.resource)) {
        return prev;
      }

      const { text } = curr.resource;
      const c4JsonData = JSON.parse(text) as C4JsonType;
      prev.sources.push(convertC4JsonToSource(c4JsonData));
      prev.content.push(convertC4JsonToText(c4JsonData));

      return prev;
    },
    { content: [] as MCPText[], sources: [] as Source[] } as TransformedResponse,
  );
}
