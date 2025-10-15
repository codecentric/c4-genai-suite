import { ChatContext } from 'src/domain/chat';
import { RenderPromptMiddleware } from './render-prompt-middleware';

describe('RenderPromptMiddleware', () => {
  it('replaces all template variables in systemMessages', async () => {
    const mw = new RenderPromptMiddleware();

    const ctx: ChatContext = {
      llm: 'openai',
      llms: {
        openai: { modelName: 'gpt-test', providerName: 'openai' },
      },
      user: { name: 'alice' },
      configuration: { name: 'assistant-x', description: 'helps with x' },
      systemMessages: [
        'time: {{ timestamp }}',
        'date: {{ date }}',
        'llm: {{ llm_name }} ({{ llm_provider }})',
        'user: {{ user }}',
        'assistant: {{ assistant }} - {{ assistant_description }}',
      ],
    } as unknown as ChatContext;

    const next = (c: ChatContext) => {
      // assert that there are no unreplaced nunjucks tags
      for (const msg of c.systemMessages) {
        expect(msg).not.toMatch(/\{\{\s*[^}]+\s*\}\}/);
      }
      return Promise.resolve(c);
    };

    await mw.invoke(ctx, () => ctx, next);

    expect(ctx.systemMessages[2]).toContain('gpt-test');
    expect(ctx.systemMessages[2]).toContain('openai');
    expect(ctx.systemMessages[3]).toContain('alice');
    expect(ctx.systemMessages[4]).toContain('assistant-x');
    expect(ctx.systemMessages[4]).toContain('helps with x');

    // timestamp/date should match ISO patterns
    expect(ctx.systemMessages[0]).toMatch(/time: \d{4}-\d{2}-\d{2}T/);
    expect(ctx.systemMessages[1]).toMatch(/date: \d{4}-\d{2}-\d{2}/);
  });
});
