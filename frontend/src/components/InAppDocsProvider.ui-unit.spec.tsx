import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ProfileContext } from 'src/hooks';
import { InAppDocsProvider, useDocsContext } from './InAppDocsProvider';

vi.mock('react-router-dom', () => ({
  useLocation: vi.fn(() => ({ pathname: '/test-path' })), // Ensure pathname is defined
  useNavigate: vi.fn(() => {}),
}));

const docsMarkdownMock = 'Mock Markdown Content';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: docsMarkdownMock,
    isSuccess: true,
  })),
}));

const ProfileProvider = ({ children }: PropsWithChildren) => (
  <ProfileContext.Provider value={{ id: '', name: 'Admin', email: 'admin@admin.com', isAdmin: true }}>
    {children}
  </ProfileContext.Provider>
);
const TestComponent = () => {
  const { isDocsButtonVisible, toggleDocs } = useDocsContext();
  return (
    <button data-testid="test-button" onClick={toggleDocs}>
      {isDocsButtonVisible ? 'show docs button' : 'hide docs button'}
    </button>
  );
};

describe('InAppDocsProvider', () => {
  it('formatted provider is missing error is shown if needed', () => {
    expect(() => render(<TestComponent />)).toThrowError('useDocsContext must be used within InAppDocsProvider');
  });

  it('initially shows docs button and hide docs panel', () => {
    render(
      <MantineProvider>
        <ProfileProvider>
          <InAppDocsProvider>
            <TestComponent />
          </InAppDocsProvider>
        </ProfileProvider>
      </MantineProvider>,
    );

    expect(screen.queryByTestId('test-button')!.textContent).toBe('show docs button');
    expect(screen.queryByText(docsMarkdownMock)).not.toBeInTheDocument();
  });

  it('after toggle: hides docs button and shows docs panel', () => {
    render(
      <MantineProvider>
        <ProfileProvider>
          <InAppDocsProvider>
            <TestComponent />
          </InAppDocsProvider>
        </ProfileProvider>
      </MantineProvider>,
    );

    fireEvent.click(screen.queryByTestId('test-button')!);
    expect(screen.queryByTestId('test-button')!.textContent).toBe('hide docs button');
    expect(screen.getByText(docsMarkdownMock)).toBeInTheDocument();
  });

  it('close button: shows docs button and hides docs panel', () => {
    render(
      <MantineProvider>
        <ProfileProvider>
          <InAppDocsProvider>
            <TestComponent />
          </InAppDocsProvider>
        </ProfileProvider>
      </MantineProvider>,
    );

    fireEvent.click(screen.queryByTestId('test-button')!);
    fireEvent.click(screen.queryByTestId('close-icon')!);
    expect(screen.queryByTestId('test-button')!.textContent).toBe('show docs button');
    expect(screen.queryByText(docsMarkdownMock)).not.toBeInTheDocument();
  });
});
