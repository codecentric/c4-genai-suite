/**
 * Minimal OpenAI-compatible mock server for E2E tests.
 * Uses Node.js built-in http module (no dependencies).
 *
 * Usage:
 *   const server = await startMockLLMServer(4100);
 *   // ... run tests with baseURL http://{MOCK_LLM_HOST}:4100/v1
 *   server.close();
 */

import * as http from 'http';
import { config } from './config';

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface MockResponse {
  // Pattern to match in the last user message
  match: RegExp;
  // Optional pattern to match in system messages (for testing system prompt delivery)
  matchSystem?: RegExp;
  response?: string;
  // Dump the full context (messages + tools) as pretty-printed JSON - useful for debugging
  dumpContext?: boolean;
  toolCall?: {
    namePattern: RegExp; // Pattern to match available tool names
    arguments: Record<string, unknown>;
    // Transform function to process the tool result before responding
    // Default: echo the raw result back
    transformResult?: (toolResult: string) => string;
  };
}

// The responses are matched top to bottom. So more specific patterns should come first.
const DEFAULT_RESPONSES: MockResponse[] = [
  // this is for the conversation title generation
  {
    match: /.*/i,
    matchSystem: /Summarize the following content/i,
    response: 'Generic Title',
  },
  // Debug helper - dumps the full context as pretty-printed JSON
  { match: /dump context|debug context|show context/i, dumpContext: true },
  { match: /banane/i, response: 'banana' },
  {
    match: /wann hat.*geburtstag|when.*birthday|welcher seite|which page/i,
    toolCall: {
      namePattern: /files/i,
      arguments: {},
    },
  },
  {
    match: /welche dateien|what files/i,
    toolCall: {
      namePattern: /files/i,
      arguments: { query: '*' },
      transformResult: (result: string) => {
        try {
          const parsed = JSON.parse(result) as { filename?: string }[];
          if (parsed.length === 0) {
            return 'Keine Datei gefunden';
          }
          const filenames = parsed.map((f) => f.filename || 'unknown').join(', ');
          return filenames;
        } catch {
          return 'Keine Datei gefunden';
        }
      },
    },
  },
  // TODO: parse the page count from the tool response
  {
    match: /wie viele seiten|how many pages/i,
    toolCall: {
      namePattern: /files/i,
      arguments: { query: '*' },
      transformResult: () => '42',
    },
  },
  {
    match: /describe.*content.*table/i,
    toolCall: {
      namePattern: /files/i,
      arguments: { query: '*' },
      transformResult: (content) => `| Content |
|---------|
| ${content} |`,
    },
  },
  {
    match: /capital.*germany/i,
    matchSystem: /pirate|parrot/i,
    response: 'Arrr, the capital of Germany be Berlin, matey! Reminds me of me dear parrot who died there.',
  },
  { match: /capital.*germany/i, response: 'Berlin' },
  {
    match: /how many files/i,
    toolCall: {
      namePattern: /files/i,
      arguments: { query: '*' },
      transformResult: (result: string) => {
        try {
          const parsed = JSON.parse(result) as unknown[];
          const count = parsed.length;
          return `${count} file${count === 1 ? '' : 's'}`;
        } catch {
          return 'failed';
        }
      },
    },
  },
  {
    match: /geburtstag|birthday/i,
    toolCall: {
      namePattern: /files/i,
      arguments: { query: 'birthday' },
    },
  },
  {
    match: /keyword|codeword/i,
    toolCall: {
      namePattern: /files/i,
      arguments: { query: 'keyword codeword' },
    },
  },
  {
    match: /pudding/i,
    toolCall: {
      namePattern: /files/i,
      arguments: { query: 'pudding' },
    },
  },
  { match: /!\[Image\]/i, response: '![Image](fakeUrl)' },
  {
    match: /Amtsgericht_Ohligs/i,
    toolCall: {
      namePattern: /fetch/i,
      arguments: { url: 'https://de.wikipedia.org/wiki/Amtsgericht_Ohligs' },
    },
  },
  {
    match: /user arguments/i,
    toolCall: {
      namePattern: /user-args/i,
      arguments: {},
    },
  },
  {
    match: /two-column table/i,
    response: `| Letter | Word |
|--------|------|
| a | ant |
| b | bat |
| c | cup |
| d | dog |
| e | egg |
| f | fan |
| g | gum |
| h | hat |
| i | ink |
| j | jam |
| k | key |
| l | log |
| m | map |
| n | net |
| o | owl |
| p | pen |
| q | quiz |
| r | rug |
| s | sun |
| t | tap |
| u | urn |
| v | van |
| w | web |
| x | box |
| y | yak |
| z | zip |`,
  },
  {
    match: /who are you/i,
    matchSystem: /Bob/,
    response: 'My name is Bob.',
  },
  {
    match: /who are you/i,
    matchSystem: /Alice/,
    response: 'My name is Alice.',
  },
  { match: /answer to life, the universe and everything/i, response: '42' },
  { match: /hello|hi|hey/i, response: 'Hello! How can I help you?' },
];

const TUTORIAL_RESPONSE = `## Mock LLM: No matching response found

Your message does not match any predefined mock response.

### How to add a new mock response:

Edit \`e2e/tests/utils/mock-llm-server.ts\` and add to the \`DEFAULT_RESPONSES\` array:

\`\`\`typescript
// Simple text response
{ match: /your pattern/i, response: 'Your response text' },

// Response that checks system prompt
{
  match: /your pattern/i,
  matchSystem: /some system prompt text/i,
  response: 'Response when system prompt matches',
},

// Response that triggers a tool call
{
  match: /your pattern/i,
  toolCall: {
    namePattern: /tool_name/i,
    arguments: { key: 'value' },
  },
},

// Tool call with result transformation
{
  match: /your pattern/i,
  toolCall: {
    namePattern: /tool_name/i,
    arguments: { query: '*' },
    transformResult: (result) => \`Processed: \${result}\`,
  },
},
\`\`\`

**Note:** Responses are matched top-to-bottom. Place more specific patterns before general ones.

**Note:** You can type "debug context" to get a dump of the full context including the available tools.
`;

interface FoundResponse {
  type: 'text' | 'tool_call';
  text?: string;
  toolCall?: ToolCall;
}

function findResponse(messages: ChatMessage[], tools?: Tool[]): FoundResponse {
  // Check if the last message is a tool result - if so, find the original request and return afterToolResponse
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role === 'tool') {
    // Find the original user message that triggered the tool call
    const userMessages = messages.filter((m) => m.role === 'user');
    const lastUserMessage = userMessages[userMessages.length - 1];
    const content = lastUserMessage?.content || '';

    for (const mockResponse of DEFAULT_RESPONSES) {
      if (mockResponse.match.test(content) && mockResponse.toolCall) {
        const toolResult = lastMessage.content || '';
        // Apply transform function if provided, otherwise echo the raw result
        const transform = mockResponse.toolCall.transformResult || ((r: string) => r);
        return { type: 'text', text: transform(toolResult) };
      }
    }
    return { type: 'text', text: 'I processed the tool results.' };
  }

  // Find the last user message and system messages
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  const content = lastUserMessage?.content || '';
  const systemContent = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content || '')
    .join(' ');

  for (const mockResponse of DEFAULT_RESPONSES) {
    // Check if user message matches
    if (!mockResponse.match.test(content)) {
      continue;
    }

    // If matchSystem is specified, also check system prompt
    if (mockResponse.matchSystem && !mockResponse.matchSystem.test(systemContent)) {
      continue;
    }

    // Dump the full context as pretty-printed JSON for debugging
    if (mockResponse.dumpContext) {
      const context = {
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content?.substring(0, 500) + (m.content && m.content.length > 500 ? '...' : ''),
          ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
          ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
        })),
        tools: tools || [],
      };
      const dump = `## Context Dump

\`\`\`json
${JSON.stringify(context, null, 2)}
\`\`\``;
      return { type: 'text', text: dump };
    }

    // Check if this should trigger a tool call
    if (mockResponse.toolCall && tools && tools.length > 0) {
      // Find a matching tool
      const matchingTool = tools.find((t) => mockResponse.toolCall!.namePattern.test(t.function.name));
      if (matchingTool) {
        return {
          type: 'tool_call',
          toolCall: {
            id: `call_${Date.now()}`,
            type: 'function',
            function: {
              name: matchingTool.function.name,
              arguments: JSON.stringify(mockResponse.toolCall.arguments),
            },
          },
        };
      }
    }

    // Regular text response
    if (mockResponse.response) {
      return { type: 'text', text: mockResponse.response };
    }
  }

  // No matching response found - return a helpful tutorial
  return { type: 'text', text: TUTORIAL_RESPONSE };
}

function parseBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => resolve(body));
  });
}

function sendJson(res: http.ServerResponse, data: object, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

interface ChatMessage {
  role: string;
  content?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface Tool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

interface ChatRequest {
  messages: ChatMessage[];
  stream?: boolean;
  tools?: Tool[];
}

function handleChatCompletions(body: string, res: http.ServerResponse) {
  const parsed = JSON.parse(body) as ChatRequest;
  const { messages, stream, tools } = parsed;
  const response = findResponse(messages, tools);

  if (stream) {
    // Streaming response
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const id = `chatcmpl-${Date.now()}`;
    const created = Math.floor(Date.now() / 1000);

    if (response.type === 'tool_call' && response.toolCall) {
      // Stream tool call
      const toolCall = response.toolCall;

      // First chunk with role and tool call start
      res.write(
        `data: ${JSON.stringify({
          id,
          object: 'chat.completion.chunk',
          created,
          model: 'mock-gpt-4',
          choices: [
            {
              index: 0,
              delta: {
                role: 'assistant',
                tool_calls: [
                  {
                    index: 0,
                    id: toolCall.id,
                    type: 'function',
                    function: { name: toolCall.function.name, arguments: '' },
                  },
                ],
              },
              finish_reason: null,
            },
          ],
        })}\n\n`,
      );

      // Stream arguments
      const args = toolCall.function.arguments;
      res.write(
        `data: ${JSON.stringify({
          id,
          object: 'chat.completion.chunk',
          created,
          model: 'mock-gpt-4',
          choices: [
            {
              index: 0,
              delta: {
                tool_calls: [{ index: 0, function: { arguments: args } }],
              },
              finish_reason: null,
            },
          ],
        })}\n\n`,
      );

      // Final chunk
      res.write(
        `data: ${JSON.stringify({
          id,
          object: 'chat.completion.chunk',
          created,
          model: 'mock-gpt-4',
          choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }],
        })}\n\n`,
      );
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      // Stream text response
      const responseText = response.text || 'I understand your question.';

      // First chunk with role
      res.write(
        `data: ${JSON.stringify({
          id,
          object: 'chat.completion.chunk',
          created,
          model: 'mock-gpt-4',
          choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }],
        })}\n\n`,
      );

      // Send content in chunks
      const words = responseText.split(' ');
      let i = 0;

      const sendNext = () => {
        if (i < words.length) {
          res.write(
            `data: ${JSON.stringify({
              id,
              object: 'chat.completion.chunk',
              created,
              model: 'mock-gpt-4',
              choices: [{ index: 0, delta: { content: words[i] + ' ' }, finish_reason: null }],
            })}\n\n`,
          );
          i++;
          setTimeout(sendNext, 20);
        } else {
          // Final chunk
          res.write(
            `data: ${JSON.stringify({
              id,
              object: 'chat.completion.chunk',
              created,
              model: 'mock-gpt-4',
              choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
            })}\n\n`,
          );
          res.write('data: [DONE]\n\n');
          res.end();
        }
      };

      setTimeout(sendNext, 20);
    }
  } else {
    // Non-streaming response
    if (response.type === 'tool_call' && response.toolCall) {
      sendJson(res, {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'mock-gpt-4',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [response.toolCall],
            },
            finish_reason: 'tool_calls',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      });
    } else {
      sendJson(res, {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'mock-gpt-4',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: response.text || 'I understand your question.' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      });
    }
  }
}

export async function startMockLLMServer(port = 4100): Promise<{ server: http.Server; close: () => void; url: string }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = req.url || '';

      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (url === '/health' && req.method === 'GET') {
        sendJson(res, { status: 'ok' });
      } else if (url === '/v1/models' && req.method === 'GET') {
        sendJson(res, { data: [{ id: 'mock-gpt-4', object: 'model' }] });
      } else if (url === '/v1/chat/completions' && req.method === 'POST') {
        void parseBody(req).then((body) => {
          handleChatCompletions(body, res);
        });
      } else {
        sendJson(res, { error: 'Not found' }, 404);
      }
    });

    server.listen(port, '0.0.0.0', () => {
      const host = config.MOCK_LLM_HOST;
      console.log(`[MockLLM] Running on http://0.0.0.0:${port}, accessible to backend at http://${host}:${port}`);
      resolve({
        server,
        close: () => server.close(),
        url: `http://${host}:${port}/v1`,
      });
    });
  });
}
