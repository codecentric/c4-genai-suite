import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'src/pages/admin/test-utils';
import { DownloadProgressBanner } from './DownloadProgressBanner';

const defaultProps = {
  downloadProgress: { loaded: 66060288, total: 146800640, percentage: 45 },
  onCancel: vi.fn(),
  isDownloading: true,
};

describe('DownloadProgressBanner', () => {
  it('should render progress bar with correct percentage value', () => {
    render(<DownloadProgressBanner {...defaultProps} />);
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toBeInTheDocument();
    expect(progressbar.getAttribute('aria-valuenow')).toBe('45');
  });

  it('should render formatted MB text', () => {
    render(<DownloadProgressBanner {...defaultProps} />);
    expect(screen.getByText(/63 MB \/ 140 MB/)).toBeInTheDocument();
  });

  it('should render cancel button with aria-label', () => {
    render(<DownloadProgressBanner {...defaultProps} />);
    const cancelButton = screen.getByRole('button', { name: /cancel download/i });
    expect(cancelButton).toBeInTheDocument();
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const onCancel = vi.fn();
    render(<DownloadProgressBanner {...defaultProps} onCancel={onCancel} />);
    const cancelButton = screen.getByRole('button', { name: /cancel download/i });
    await userEvent.click(cancelButton);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('should have role=status and aria-live=polite', () => {
    render(<DownloadProgressBanner {...defaultProps} />);
    const banner = screen.getByRole('status');
    expect(banner).toBeInTheDocument();
    expect(banner.getAttribute('aria-live')).toBe('polite');
  });

  it('should show Ready text when download completes', () => {
    const { rerender } = render(<DownloadProgressBanner {...defaultProps} />);
    rerender(<DownloadProgressBanner {...defaultProps} isDownloading={false} />);
    expect(screen.getByText(/ready/i)).toBeInTheDocument();
  });
});
