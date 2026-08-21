import { search } from 'duck-duck-scrape';
import type { ChatContext, ChatNextDelegate, Source } from 'src/domain/chat';
import type { ExtensionEntity } from 'src/domain/extensions';
import type { User } from 'src/domain/users';
import type { I18nService } from '../../localization/i18n.service';
import { DuckduckgoWebSearchExtension } from './duckduckgo-web-search';

jest.mock('duck-duck-scrape', () => ({
  search: jest.fn(),
}));

const searchMock = jest.mocked(search);

describe('DuckduckgoWebSearchExtension', () => {
  it('maps Web results into tool output and conversation sources', async () => {
    searchMock.mockResolvedValue({
      noResults: false,
      vqd: 'test-vqd',
      results: [
        {
          hostname: 'example.com',
          title: 'Example result',
          url: 'https://example.com/result',
          description: 'Example description',
          rawDescription: 'Example description',
          icon: 'https://example.com/favicon.ico',
        },
        {
          hostname: 'example.com',
          title: 'Ignored result',
          url: 'https://example.com/ignored',
          description: 'Ignored by maxResults',
          rawDescription: 'Ignored by maxResults',
          icon: 'https://example.com/favicon.ico',
        },
      ],
    });
    const addSources = jest.fn();
    const context = {
      tools: [],
      history: { addSources },
    } as unknown as ChatContext;
    const i18n = { t: (key: string) => key } as unknown as I18nService;
    const extension = new DuckduckgoWebSearchExtension(i18n);
    const [middleware] = await extension.getMiddlewares(
      {} as User,
      {
        values: { maxResults: 1 },
        externalId: 'duck-search',
      } as ExtensionEntity<{ maxResults: number }>,
    );

    const next: ChatNextDelegate = (value) => Promise.resolve(value);
    await middleware.invoke(context, () => context, next);
    const output = await context.tools[0].execute({ query: 'test query' });
    if (typeof output !== 'string') {
      throw new Error('Expected the DuckDuckGo tool to return JSON text');
    }

    expect(JSON.parse(output)).toEqual([
      {
        title: 'Example result',
        link: 'https://example.com/result',
        snippet: 'Example description',
      },
    ]);
    expect(addSources).toHaveBeenCalledTimes(1);
    const [sourceName, sources] = addSources.mock.calls[0] as unknown as [string, Source[]];
    expect(sourceName).toBe('duck-search');
    expect(sources[0].title).toBe('Example result');
    expect(sources[0].document?.uri).toBe('https://example.com/result');
  });
});
