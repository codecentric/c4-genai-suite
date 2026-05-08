import { IconShieldCheck } from '@tabler/icons-react';
import { texts } from 'src/texts';

export function PrivacyBadge() {
  return (
    <span
      className="flex items-center gap-1"
      data-tooltip-id="default"
      data-tooltip-content={texts.chat.localTranscribe.privacyTooltip}
      tabIndex={0}
    >
      <IconShieldCheck size={14} className="text-green-700" />
      <span className="text-sm text-green-700">
        {texts.chat.localTranscribe.privacyBadge}
      </span>
    </span>
  );
}
