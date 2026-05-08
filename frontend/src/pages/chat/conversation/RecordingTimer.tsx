import { texts } from 'src/texts';

interface RecordingTimerProps {
  elapsedSeconds: number;
  maxSeconds: number;
}

export function RecordingTimer({ elapsedSeconds, maxSeconds }: RecordingTimerProps) {
  const WARNING_THRESHOLD = maxSeconds - 15;
  const isWarning = elapsedSeconds >= WARNING_THRESHOLD;

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <span
      className={`text-xs font-semibold ${isWarning ? 'text-red-600' : 'text-gray-600'}`}
      style={{ fontVariantNumeric: 'tabular-nums' }}
      aria-label={texts.chat.localTranscribe.timerLabel}
      aria-live="off"
    >
      {formatTime(elapsedSeconds)} / {formatTime(maxSeconds)}
    </span>
  );
}
