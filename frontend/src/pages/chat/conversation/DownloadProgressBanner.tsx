import { ActionIcon, Progress } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { DownloadProgress } from 'src/hooks/useLocalTranscribe';
import { texts } from 'src/texts';

interface DownloadProgressBannerProps {
  downloadProgress: DownloadProgress;
  onCancel: () => void;
  isDownloading: boolean;
}

type BannerPhase = 'downloading' | 'ready' | 'hidden';

export function DownloadProgressBanner({ downloadProgress, onCancel, isDownloading }: DownloadProgressBannerProps) {
  const wasDownloadingRef = useRef(isDownloading);
  const [phase, setPhase] = useState<BannerPhase>('downloading');

  // When download completes (isDownloading transitions to false), show "Ready!" briefly
  useEffect(() => {
    if (wasDownloadingRef.current && !isDownloading) {
      const readyTimer = setTimeout(() => setPhase('ready'), 0);
      const hideTimer = setTimeout(() => setPhase('hidden'), 1500);
      wasDownloadingRef.current = isDownloading;
      return () => {
        clearTimeout(readyTimer);
        clearTimeout(hideTimer);
      };
    }
    wasDownloadingRef.current = isDownloading;
  }, [isDownloading]);

  if (phase === 'hidden') return null;

  const loadedMB = (downloadProgress.loaded / (1024 * 1024)).toFixed(0);
  const totalMB = (downloadProgress.total / (1024 * 1024)).toFixed(0);

  return (
    <div className="mb-2 flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2" role="status" aria-live="polite">
      {phase === 'ready' ? (
        <span className="text-sm font-semibold text-green-600">{texts.chat.localTranscribe.downloadReady}</span>
      ) : (
        <>
          <span className="text-sm font-semibold text-gray-700">{texts.chat.localTranscribe.downloadingModel}</span>
          <Progress
            value={downloadProgress.percentage}
            className="flex-1"
            aria-label={texts.chat.localTranscribe.downloadProgress}
          />
          <span className="text-sm whitespace-nowrap text-gray-500">
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
