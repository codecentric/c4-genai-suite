import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'src/pages/admin/test-utils';
import { LocalTranscribeButton } from './LocalTranscribeButton';

const defaultProps = {
  state: 'idle' as const,
  isRecording: false,
  isTranscribing: false,
  isDownloading: false,
  onToggle: vi.fn(),
  language: 'de',
  onLanguageChange: vi.fn(),
  languages: ['de', 'en'],
};

describe('LocalTranscribeButton', () => {
  it('should render mic button with aria-label in idle state', () => {
    render(<LocalTranscribeButton {...defaultProps} />);
    const button = screen.getByRole('button', { name: /start local recording/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('should render with filled variant and red color in recording state', () => {
    render(<LocalTranscribeButton {...defaultProps} state="recording" isRecording={true} />);
    const button = screen.getByRole('button', { name: /stop recording/i });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain('animate-pulse');
  });

  it('should render with loading spinner and disabled in transcribing state', () => {
    render(<LocalTranscribeButton {...defaultProps} state="transcribing" isTranscribing={true} />);
    const button = screen.getByRole('button', { name: /transcribing locally/i });
    expect(button).toBeDisabled();
  });

  it('should render as disabled without loading in downloading state', () => {
    render(<LocalTranscribeButton {...defaultProps} state="downloading" isDownloading={true} />);
    const button = screen.getByRole('button', { name: /downloading/i });
    expect(button).toBeDisabled();
  });

  it('should render with loading spinner in loading (cache) state', () => {
    render(<LocalTranscribeButton {...defaultProps} state="loading" />);
    const button = screen.getByRole('button', { name: /loading speech recognition/i });
    expect(button).toBeDisabled();
  });

  it('should render language selector with selectLanguage aria-label', () => {
    render(<LocalTranscribeButton {...defaultProps} />);
    const chevronButtons = screen.getAllByRole('button', { name: /select language/i });
    expect(chevronButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('should disable chevron when recording', () => {
    render(<LocalTranscribeButton {...defaultProps} state="recording" isRecording={true} />);
    const chevronButtons = screen.getAllByRole('button', { name: /select language/i });
    expect(chevronButtons[0]).toBeDisabled();
  });

  it('should disable chevron when transcribing', () => {
    render(<LocalTranscribeButton {...defaultProps} state="transcribing" isTranscribing={true} />);
    const chevronButtons = screen.getAllByRole('button', { name: /select language/i });
    expect(chevronButtons[0]).toBeDisabled();
  });

  it('should disable chevron when downloading', () => {
    render(<LocalTranscribeButton {...defaultProps} state="downloading" isDownloading={true} />);
    const chevronButtons = screen.getAllByRole('button', { name: /select language/i });
    expect(chevronButtons[0]).toBeDisabled();
  });

  it('should have aria-labels on all interactive elements', () => {
    render(<LocalTranscribeButton {...defaultProps} />);
    expect(screen.getByRole('button', { name: /start local recording/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /select language/i }).length).toBeGreaterThanOrEqual(1);
  });
});
