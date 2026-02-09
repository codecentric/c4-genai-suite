import { Button, FileInput, Portal } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconUpload } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { useEvalApi } from 'src/api/state/apiEvalClient';
import { FormAlert, Modal } from 'src/components';
import { typedZodResolver } from 'src/lib';
import { texts } from 'src/texts';

interface UploadQaCatalogDialogProps {
  catalogId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ACCEPTED_FILE_TYPES = '.csv,.json,.xlsx';

const schema = z.object({
  file: z.instanceof(File, { message: texts.evals.qaCatalog.fileRequired }),
});

type FormValues = z.infer<typeof schema>;

export function UploadQaCatalogDialog({ catalogId, onClose, onSuccess }: UploadQaCatalogDialogProps) {
  const evalApi = useEvalApi();

  const form = useForm<FormValues>({
    validate: typedZodResolver(schema),
    initialValues: {
      file: null as unknown as File,
    },
    mode: 'controlled',
  });

  const uploadMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      console.log('Uploading file:', values.file.name, 'to catalog:', catalogId);
      // Use the generated API client method directly
      return await evalApi.qaCatalog.qaCatalogUpdate(catalogId, values.file);
    },
    onSuccess: () => {
      toast.success(texts.evals.qaCatalog.uploadSuccess);
      onSuccess();
    },
    onError: (error: unknown) => {
      console.error('Upload error:', error);
      toast.error(texts.evals.qaCatalog.uploadFailed);
    },
  });

  const handleSubmit = form.onSubmit((values) => {
    uploadMutation.mutate(values);
  });

  return (
    <Portal>
      <form noValidate onSubmit={handleSubmit}>
        <Modal
          onClose={onClose}
          header={texts.evals.qaCatalog.uploadTitle}
          footer={
            <fieldset disabled={uploadMutation.isPending}>
              <div className="flex flex-row justify-end gap-4">
                <Button type="button" variant="subtle" onClick={onClose}>
                  {texts.common.cancel}
                </Button>
                <Button type="submit" leftSection={<IconUpload size={16} />} loading={uploadMutation.isPending}>
                  {texts.evals.qaCatalog.uploadFile}
                </Button>
              </div>
            </fieldset>
          }
        >
          <fieldset disabled={uploadMutation.isPending}>
            <FormAlert common={texts.evals.qaCatalog.uploadFailed} error={uploadMutation.error as Error | null} />

            <p className="mb-4 text-sm text-gray-500">{texts.evals.qaCatalog.uploadHint}</p>

            <FileInput
              id="file"
              withAsterisk
              label={texts.evals.qaCatalog.uploadFile}
              description={texts.evals.qaCatalog.uploadFileFormats}
              placeholder={texts.evals.qaCatalog.uploadFileHint}
              accept={ACCEPTED_FILE_TYPES}
              leftSection={<IconUpload size={16} />}
              className="mb-4"
              key={form.key('file')}
              {...form.getInputProps('file')}
            />
          </fieldset>
        </Modal>
      </form>
    </Portal>
  );
}
