import { Logo } from 'src/components';
import { useTheme } from 'src/hooks';

export const AiAvatar = ({ llmLogo }: { llmLogo?: string }) => {
  const { theme } = useTheme();
  const { avatarLogoUrl } = theme;

  return (
    <div className="max-h-4 min-h-4 max-w-4 min-w-4 p-0">
      {avatarLogoUrl && <Logo url={avatarLogoUrl} />}
      {!avatarLogoUrl && llmLogo && <Logo previewLogo={llmLogo} />}
      {!avatarLogoUrl && !llmLogo && (
        <div className="avatar placeholder">
          <div className="bg-cc h-full w-full rounded-full fill-black/60">AI</div>
        </div>
      )}
    </div>
  );
};
