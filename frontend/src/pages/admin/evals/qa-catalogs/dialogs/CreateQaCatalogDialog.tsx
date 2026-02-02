import { Button, FileInput, Portal, Tabs, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconFileUpload, IconSparkles, IconUpload } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { useEvalApi } from 'src/api/state/apiEvalClient';
import { FormAlert, Modal } from 'src/components';
import { typedZodResolver } from 'src/lib';
import { texts } from 'src/texts';

interface CreateQaCatalogDialogProps {
  onClose: () => void;
  onCreated?: () => void;
}

const ACCEPTED_FILE_TYPES = '.csv,.json,.xlsx';

const uploadSchema = z.object({
  name: z.string().min(1, texts.evals.qaCatalog.catalogNameRequired),
  file: z.instanceof(File, { message: texts.evals.qaCatalog.fileRequired }),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

export function CreateQaCatalogDialog({ onClose, onCreated }: CreateQaCatalogDialogProps) {
  const evalApi = useEvalApi();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string | null>('upload');

  const form = useForm<UploadFormValues>({
    validate: typedZodResolver(uploadSchema),
    initialValues: {
      name: '',
      file: null as unknown as File,
    },
    mode: 'controlled',
  });

  const uploadMutation = useMutation({
    mutationFn: async (values: UploadFormValues) => {
      return await evalApi.qaCatalog.qaCatalogUpload(values.file, values.name);
    },
    onSuccess: (catalog) => {
      toast.success(texts.evals.qaCatalog.createSuccess);
      onCreated?.();
      onClose();
      navigate(`/admin/evals/qa-catalogs/${catalog.id}`);
    },
  });

  const handleSubmit = form.onSubmit((values) => {
    uploadMutation.mutate(values);
  });

  const handleGoToGenerate = () => {
    onClose();
    navigate('/admin/evals/qa-catalogs/generate');
  };

  return (
    <Portal>
      <form noValidate onSubmit={handleSubmit}>
        <Modal
          onClose={onClose}
          header={texts.evals.qaCatalog.createTitle}
          footer={
            <fieldset disabled={uploadMutation.isPending}>
              <div className="flex flex-row justify-end gap-4">
                <Button type="button" variant="subtle" onClick={onClose}>
                  {texts.common.cancel}
                </Button>
                {activeTab === 'upload' && (
                  <Button type="submit" loading={uploadMutation.isPending}>
                    {texts.evals.qaCatalog.create}
                  </Button>
                )}
                {activeTab === 'generate' && (
                  <Button type="button" onClick={handleGoToGenerate}>
                    {texts.evals.qaCatalog.generateTitle}
                  </Button>
                )}
              </div>
            </fieldset>
          }
        >
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="upload" leftSection={<IconFileUpload size={16} />}>
                {texts.evals.qaCatalog.createTabUpload}
              </Tabs.Tab>
              <Tabs.Tab value="generate" leftSection={<IconSparkles size={16} />}>
                {texts.evals.qaCatalog.createTabGenerate}
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="upload" pt="md">
              <fieldset disabled={uploadMutation.isPending}>
                <FormAlert common={texts.evals.qaCatalog.createFailed} error={uploadMutation.error} />

                <TextInput
                  id="name"
                  withAsterisk
                  label={texts.evals.qaCatalog.catalogName}
                  placeholder={texts.evals.qaCatalog.catalogNamePlaceholder}
                  className="mb-4"
                  key={form.key('name')}
                  {...form.getInputProps('name')}
                />

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
            </Tabs.Panel>

            <Tabs.Panel value="generate" pt="md">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <IconSparkles size={48} className="mb-4 text-primary" />
                <p className="mb-4 text-lg">{texts.evals.qaCatalog.generateTitle}</p>
                <p className="text-sm text-gray-500">
                  Generate Q&A pairs automatically from your documents using AI.
                </p>
              </div>
            </Tabs.Panel>
          </Tabs>
        </Modal>
      </form>
    </Portal>
  );
}
