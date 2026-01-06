import { render } from '@testing-library/react';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Markdown } from 'src/components/Markdown';

vi.mock('react-syntax-highlighter', () => ({
  Prism: (props: { children: React.ReactNode; [key: string]: unknown }) => {
    const { children, ...other } = props;
    return (
      <code data-testid="syntax-highlighted-code" {...other}>
        {children}
      </code>
    );
  },
}));
vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  vscDarkPlus: {},
}));

describe('Markdown component', () => {
  it('renders table correctly', () => {
    const content = '| Header1 | Header2 |\n|---------|---------|\n| Hello   | C4   |';
    render(<Markdown>{content}</Markdown>);

    const markdownTable = screen.getByRole('table');
    expect(markdownTable).toBeInTheDocument();

    const header1 = screen.getByRole('columnheader', { name: 'Header1' });
    const header2 = screen.getByRole('columnheader', { name: 'Header2' });

    expect(header1).toBeInTheDocument();
    expect(header2).toBeInTheDocument();

    const cellHello = screen.getByRole('cell', { name: 'Hello' });
    const cellC4 = screen.getByRole('cell', { name: 'C4' });
    expect(cellHello).toBeInTheDocument();
    expect(cellC4).toBeInTheDocument();
  });

  it('renders img correctly', () => {
    const imageUrl = 'https://c4.dev.ccopt.de/blobs/7a181be7-fa78-4bfe-bf02-faaa3392b926';
    const content = `![Image](${imageUrl})`;
    render(<Markdown>{content}</Markdown>);

    const markdownImage = screen.getByRole<HTMLImageElement>('img');
    expect(markdownImage).toBeInTheDocument();
    expect(markdownImage.src).toBe(imageUrl);
  });

  it('inline code does not have a copy button', () => {
    const content = 'This is `inline code` in a sentence.';
    render(<Markdown>{content}</Markdown>);

    const codeElement = screen.getByText('inline code');
    expect(codeElement.tagName).toBe('CODE');

    const copyIcon = screen.queryByTestId('copy-code-button');
    expect(copyIcon).not.toBeInTheDocument();
  });

  it('fenced code block without language has a copy button', () => {
    const content = '```\nconst x = 42;\n```';
    render(<Markdown>{content}</Markdown>);

    expect(screen.getByText(/const x = 42/)).toBeInTheDocument();

    const copyIcon = screen.getByTestId('copy-code-button');
    expect(copyIcon).toBeInTheDocument();
  });

  it('fenced code block with language has a copy button', () => {
    const content = '```javascript\nconst greeting = "Hello";\n```';
    render(<Markdown>{content}</Markdown>);

    expect(screen.getByText(/const greeting = "Hello";/)).toBeInTheDocument();

    const copyIcon = screen.getByTestId('copy-code-button');
    expect(copyIcon).toBeInTheDocument();
  });
});
