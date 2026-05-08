import { describe, expect, it, vi } from 'vitest';
import { render } from 'src/pages/admin/test-utils';
import { PrivacyBadge } from './PrivacyBadge';

// Mock texts to provide i18n values in test environment
vi.mock('src/texts', () => ({
  texts: {
    chat: {
      localTranscribe: {
        privacyBadge: 'Local',
        privacyTooltip: 'Audio is processed locally and never leaves your browser',
      },
    },
  },
}));

describe('PrivacyBadge', () => {
  it('should render the badge text from i18n', () => {
    const { container } = render(<PrivacyBadge />);
    const badgeSpan = container.querySelector('span.flex');
    const textSpan = badgeSpan?.querySelector('span.text-sm');
    expect(textSpan?.textContent).toBe('Local');
  });

  it('should render a shield icon', () => {
    const { container } = render(<PrivacyBadge />);
    // Tabler icons render as SVG elements
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should have tooltip attributes for privacy explanation', () => {
    const { container } = render(<PrivacyBadge />);
    const badge = container.querySelector('span.flex') as HTMLElement;
    expect(badge).not.toBeNull();
    expect(badge.getAttribute('data-tooltip-id')).toBe('default');
    expect(badge.getAttribute('data-tooltip-content')).toBe('Audio is processed locally and never leaves your browser');
  });

  it('should be focusable for keyboard tooltip access', () => {
    const { container } = render(<PrivacyBadge />);
    const badge = container.querySelector('span.flex') as HTMLElement;
    expect(badge).not.toBeNull();
    expect(badge.getAttribute('tabindex')).toBe('0');
  });

  it('should use green color for text and icon', () => {
    const { container } = render(<PrivacyBadge />);
    const textSpan = container.querySelector('span.text-sm.text-green-700');
    expect(textSpan).not.toBeNull();
    expect(textSpan?.textContent).toBe('Local');

    const svg = container.querySelector('svg.text-green-700');
    expect(svg).not.toBeNull();
  });
});
