import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NavigationBar } from 'src/components/NavigationBar';
import { render } from 'src/pages/admin/test-utils';
import { InAppDocsProvider } from './InAppDocsProvider';

describe('Markdown component', () => {
  it('renders logo without text if logo present', () => {
    const theme = { logoUrl: '/settings/logo', name: 'Test' };
    render(
      <InAppDocsProvider>
        <NavigationBar theme={theme}></NavigationBar>
      </InAppDocsProvider>,
    );

    const logo = screen.getByRole<HTMLImageElement>('img');
    expect(logo).toBeInTheDocument();
    expect(logo.src).toContain(theme.logoUrl);

    // Should have sr-only h1 for accessibility
    const heading = screen.getByRole('heading', { level: 1, name: theme.name });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('sr-only');

    // Theme name should not be visible (only in sr-only element)
    const elements = screen.getAllByText(theme.name);
    const visibleElements = elements.filter((el) => !el.classList.contains('sr-only'));
    expect(visibleElements.length).toEqual(0);
  });

  it('renders text without logo if logo is not present', () => {
    const theme = { name: 'Test' };
    render(
      <InAppDocsProvider>
        <NavigationBar theme={theme}></NavigationBar>
      </InAppDocsProvider>,
    );

    // Should have a visible text element
    const elements = screen.getAllByText(theme.name);
    expect(elements.length).toEqual(2); // sr-only h1 + visible element

    // Should have an sr-only h1 for accessibility
    const heading = screen.getByRole('heading', { level: 1, name: theme.name });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('sr-only');

    const logo = screen.queryByRole('img');
    expect(logo).not.toBeInTheDocument();
  });
});
