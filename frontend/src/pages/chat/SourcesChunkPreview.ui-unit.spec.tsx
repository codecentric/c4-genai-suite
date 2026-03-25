import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SourcesChunkPreview, SourcesChunkPreviewProps } from 'src/pages/chat/SourcesChunkPreview';
import { texts } from 'src/texts';
import { render } from '../admin/test-utils';

describe('SourcesChunkPreview', () => {
  const defaultProps: SourcesChunkPreviewProps = {
    onClose: vi.fn(),
    document: { conversationId: 0, messageId: 0, documentUri: 'test' },
  };

  it('should call onClose when cancel button is clicked', async () => {
    render(<SourcesChunkPreview {...defaultProps} />);

    const user = userEvent.setup();
    const cancelButton = screen.getByRole('button', { name: texts.accessibility.closeDialog });
    await user.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
