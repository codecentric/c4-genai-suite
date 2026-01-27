/**
 * Minimal OpenAI-compatible mock server for E2E tests.
 * Uses Node.js built-in http module (no dependencies).
 *
 * Usage:
 *   const server = await startMockLLMServer(4100);
 *   // ... run tests with baseURL http://localhost:4100/v1
 *   server.close();
 */

import * as http from 'http';

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface MockResponse {
  match: RegExp;
  response?: string;
  toolCall?: {
    namePattern: RegExp; // Pattern to match available tool names
    arguments: Record<string, unknown>;
  };
  // Response to give after tool result is received
  afterToolResponse?: string;
  // If true, echo back the raw tool result as the response
  echoToolResult?: boolean;
}

const DEFAULT_RESPONSES: MockResponse[] = [
  { match: /banane/i, response: 'banana' },
  { match: /capital.*germany/i, response: 'Berlin' },
  { match: /how many files/i, response: '1 file' },
  { match: /keine datei|no file/i, response: 'no files' },
  {
    match: /geburtstag|birthday/i,
    toolCall: {
      namePattern: /files|search/i,
      arguments: { query: 'birthday' },
    },
    echoToolResult: true,
  },
  {
    match: /keyword|codeword/i,
    toolCall: {
      namePattern: /files|search/i,
      arguments: { query: 'keyword codeword' },
    },
    echoToolResult: true,
  },
  {
    match: /pudding/i,
    toolCall: {
      namePattern: /files|search/i,
      arguments: { query: 'pudding' },
    },
    echoToolResult: true,
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
  { match: /!\[Image\]/i, response: '![Image](fakeUrl)' },
  { match: /hello|hi|hey/i, response: 'Hello! How can I help you?' },
];

interface FoundResponse {
  type: 'text' | 'tool_call';
  text?: string;
  toolCall?: ToolCall;
  afterToolResponse?: string;
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
      if (mockResponse.match.test(content)) {
        if (mockResponse.echoToolResult) {
          // Echo back the raw tool result
          const toolResult = lastMessage.content || '';
          return { type: 'text', text: toolResult };
        }
        if (mockResponse.afterToolResponse) {
          return { type: 'text', text: mockResponse.afterToolResponse };
        }
      }
    }
    return { type: 'text', text: 'I processed the tool results.' };
  }

  // Find the last user message
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  const content = lastUserMessage?.content || '';

  for (const mockResponse of DEFAULT_RESPONSES) {
    if (mockResponse.match.test(content)) {
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
            afterToolResponse: mockResponse.afterToolResponse,
          };
        }
      }

      // Regular text response
      if (mockResponse.response) {
        return { type: 'text', text: mockResponse.response };
      }
    }
  }

  return { type: 'text', text: 'I understand your question.' };
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
          setTimeout(sendNext, 10);
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

      setTimeout(sendNext, 10);
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

    server.listen(port, () => {
      console.log(`[MockLLM] Running on http://localhost:${port}`);
      resolve({
        server,
        close: () => server.close(),
        url: `http://localhost:${port}/v1`,
      });
    });
  });
}
