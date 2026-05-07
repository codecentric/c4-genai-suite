import { useEffect, useState } from 'react';
import { ActionIcon, Progress } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { DownloadProgress } from 'src/hooks/useLocalTranscribe';
import { texts } from 'src/texts';

interface DownloadProgressBannerProps {
  downloadProgress: DownloadProgress;
  onCancel: () => void;
  isDownloading: boolean;
}

export function DownloadProgressBanner({ downloadProgress, onCancel, isDownloading }: DownloadProgressBannerProps) {
  const [showReady, setShowReady] = useState(false);
  const [visible, setVisible] = useState(true);

  // D-04: When download completes (isDownloading transitions to false), show "Ready!" briefly
  useEffect(() => {
    if (!isDownloading && !showReady) {
      setShowReady(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isDownloading, showReady]);

  if (!visible) return null;

  const loadedMB = (downloadProgress.loaded / (1024 * 1024)).toFixed(0);
  const totalMB = (downloadProgress.total / (1024 * 1024)).toFixed(0);

  return (
    <div
      className="mb-2 flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2"
      role="status"
      aria-live="polite"
    >
      {showReady ? (
        <span className="text-sm font-semibold text-green-600">{texts.chat.localTranscribe.downloadReady}</span>
      ) : (
        <>
          <span className="text-sm font-semibold text-gray-700">{texts.chat.localTranscribe.downloadingModel}</span>
          <Progress
            value={downloadProgress.percentage}
            className="flex-1"
            aria-label={texts.chat.localTranscribe.downloadProgress}
          />
          <span className="whitespace-nowrap text-sm text-gray-500">
            {texts.chat.localTranscribe.downloadSize(loadedMB, totalMB)}
          </span>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={onCancel}
            aria-label={texts.chat.localTranscribe.downloadCancelLabel}
          >
            <IconX className="w-3" />
          </ActionIcon>
        </>
      )}
    </div>
  );
}
