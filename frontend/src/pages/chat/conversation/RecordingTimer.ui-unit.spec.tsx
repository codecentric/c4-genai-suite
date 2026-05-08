import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { render } from 'src/pages/admin/test-utils';
import { RecordingTimer } from './RecordingTimer';

const defaultProps = {
  elapsedSeconds: 42,
  maxSeconds: 120,
};

describe('RecordingTimer', () => {
  it('should render elapsed and max time in M:SS format', () => {
    render(<RecordingTimer {...defaultProps} />);
    expect(screen.getByText('0:42 / 2:00')).toBeInTheDocument();
  });

  it('should render 0:00 / 2:00 at start', () => {
    render(<RecordingTimer elapsedSeconds={0} maxSeconds={120} />);
    expect(screen.getByText('0:00 / 2:00')).toBeInTheDocument();
  });

  it('should render 2:00 / 2:00 at maximum', () => {
    render(<RecordingTimer elapsedSeconds={120} maxSeconds={120} />);
    expect(screen.getByText('2:00 / 2:00')).toBeInTheDocument();
  });

  it('should use gray text color before warning threshold', () => {
    const { container } = render(<RecordingTimer elapsedSeconds={100} maxSeconds={120} />);
    const span = container.querySelector('span');
    expect(span?.className).toContain('text-gray-600');
    expect(span?.className).not.toContain('text-red-600');
  });

  it('should use red text color at warning threshold (last 15 seconds)', () => {
    const { container } = render(<RecordingTimer elapsedSeconds={105} maxSeconds={120} />);
    const span = container.querySelector('span');
    expect(span?.className).toContain('text-red-600');
    expect(span?.className).not.toContain('text-gray-600');
  });

  it('should use red text color in last second', () => {
    const { container } = render(<RecordingTimer elapsedSeconds={119} maxSeconds={120} />);
    const span = container.querySelector('span');
    expect(span?.className).toContain('text-red-600');
  });

  it('should have tabular-nums font variant for stable digit width', () => {
    const { container } = render(<RecordingTimer {...defaultProps} />);
    const span = container.querySelector('span');
    expect(span?.style.fontVariantNumeric).toBe('tabular-nums');
  });

  it('should have aria-live="off" to avoid screen reader flooding', () => {
    const { container } = render(<RecordingTimer {...defaultProps} />);
    const span = container.querySelector('span');
    expect(span?.getAttribute('aria-live')).toBe('off');
  });
});
