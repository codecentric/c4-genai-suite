import { Button, Modal, Stack, Text, Textarea } from '@mantine/core';
import { useState } from 'react';
import { texts } from 'src/texts';

interface VersionCommentModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => void;
  title?: string;
  description?: string;
  loading?: boolean;
}

export function VersionCommentModal({
  opened,
  onClose,
  onSubmit,
  title = 'Versionskommentar hinzufügen',
  description = 'Beschreiben Sie kurz, was in dieser Version geändert wurde.',
  loading = false,
}: VersionCommentModalProps) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!comment.trim()) {
      setError('Version comment is required');
      return;
    }

    if (comment.trim().length < 3) {
      setError('Version comment must be at least 3 characters long');
      return;
    }

    onSubmit(comment.trim());
  };

  const handleClose = () => {
    setComment('');
    setError('');
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={title}
      size="md"
      centered
      closeOnClickOutside={false}
      closeOnEscape={!loading}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {description}
        </Text>

        <Textarea
          label={texts.versionComment.label}
          placeholder={texts.versionComment.placeholder}
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            setError('');
          }}
          error={error}
          minRows={3}
          maxRows={6}
          required
          disabled={loading}
          autoFocus
        />

        <div className="flex justify-end gap-2">
          <Button variant="subtle" onClick={handleClose} disabled={loading}>
            {texts.common.cancel}
          </Button>
          <Button onClick={handleSubmit} loading={loading} disabled={!comment.trim()}>
            {texts.common.save}
          </Button>
        </div>
      </Stack>
    </Modal>
  );
}
