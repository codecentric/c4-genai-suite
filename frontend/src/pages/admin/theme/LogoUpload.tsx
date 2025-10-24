import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useApi } from 'src/api';
import { Alert, Forms, Logo } from 'src/components';
import { useTheme } from 'src/hooks';
import { buildError } from 'src/lib';
import { texts } from 'src/texts';

type LogoUploadProps = {
  imageType: 'logo' | 'backgroundLogo' | 'avatarLogo';
};

export function LogoUpload({ imageType }: LogoUploadProps) {
  const api = useApi();

  const { setTheme, theme, refetch } = useTheme();
  const [previewLogo, setPreviewLogo] = useState<File | undefined | null>(undefined);

  const updating = useMutation({
    mutationFn: (request: File) => {
      return api.settings.postImage(imageType, request);
    },
    onSuccess: () => {
      refetch();
      setTheme({ key: Date.now() });
      setPreviewLogo(undefined);
    },
    onError: async (error) => {
      toast.error(await buildError(texts.theme.logoUpdateFailed, error));
    },
  });

  const deleting = useMutation({
    mutationFn: () => {
      return api.settings.deleteLogo(imageType);
    },
    onSuccess: () => {
      refetch();
      setTheme({ key: Date.now() });
      setPreviewLogo(undefined);
    },
    onError: async (error) => {
      toast.error(await buildError(texts.theme.logoDeleteFailed, error));
    },
  });

  const upload = () => {
    if (previewLogo) {
      updating.mutate(previewLogo);
    }
  };

  const deleteLogo = () => {
    deleting.mutate();
  };

  return (
    <>
      <MutationAlert error={updating.isError || deleting.isError} />

      <div>
        <div className="flex flex-row items-center gap-8">
          <div className="relative">
            <Logo size="6rem" key={theme.key} url={theme[`${imageType}Url`]} previewLogo={previewLogo} />
          </div>

          <div className="divider divider-horizontal"></div>

          <div>
            <div className="flex flex-row gap-2">
              <LogoInput onChange={setPreviewLogo} previewLogo={previewLogo} />
              <SaveButton onClick={upload} disabled={updating.isPending || !previewLogo} />
              <DeleteButton onClick={deleteLogo} disabled={!theme[`${imageType}Url`] || deleting.isPending} />
            </div>
            <Forms.Hints className="mt-2" hints={texts.theme[`${imageType}Hint`]} />
          </div>
        </div>
      </div>
    </>
  );
}

function MutationAlert({ error }: { error: boolean }) {
  if (error) return <Alert text={texts.common.error} className="mb-4" />;
}

function SaveButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button type="button" className="btn w-auto" disabled={disabled} onClick={onClick}>
      {texts.common.save}
    </button>
  );
}

function DeleteButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button type="button" className="btn w-auto" disabled={disabled} onClick={onClick}>
      {texts.common.remove}
    </button>
  );
}

function LogoInput({
  onChange,
  previewLogo,
}: {
  onChange: (file: File | undefined) => void;
  previewLogo: File | undefined | null;
}) {
  return (
    <input
      type="file"
      value={!previewLogo ? '' : undefined}
      data-testid="logo-upload-input"
      className="file-input file-input-bordered w-full max-w-xs"
      onChange={(event) => onChange(event.target.files?.[0])}
      aria-label={texts.accessibility.uploadLogoFile}
    />
  );
}
