import { Button, FileInput, Portal, Tabs, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconFile, IconFileUpload, IconUpload } from '@tabler/icons-react';
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

const emptySchema = z.object({
  name: z.string().min(1, texts.evals.qaCatalog.catalogNameRequired),
});

const uploadSchema = z.object({
  name: z.string().min(1, texts.evals.qaCatalog.catalogNameRequired),
  file: z.instanceof(File, { message: texts.evals.qaCatalog.fileRequired }),
});

type EmptyFormValues = z.infer<typeof emptySchema>;
type UploadFormValues = z.infer<typeof uploadSchema>;

export function CreateQaCatalogDialog({ onClose, onCreated }: CreateQaCatalogDialogProps) {
  const evalApi = useEvalApi();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string | null>('empty');

  const emptyForm = useForm<EmptyFormValues>({
    validate: typedZodResolver(emptySchema),
    initialValues: {
      name: '',
    },
    mode: 'controlled',
  });

  const uploadForm = useForm<UploadFormValues>({
    validate: typedZodResolver(uploadSchema),
    initialValues: {
      name: '',
      file: null as unknown as File,
    },
    mode: 'controlled',
  });

  const createEmptyMutation = useMutation({
    mutationFn: async (values: EmptyFormValues) => {
      return await evalApi.qaCatalog.qaCatalogCreateEmpty(values.name);
    },
    onSuccess: (catalog) => {
      toast.success(texts.evals.qaCatalog.createSuccess);
      onCreated?.();
      onClose();
      void navigate(`/admin/evals/qa-catalogs/${catalog.id}`);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (values: UploadFormValues) => {
      return await evalApi.qaCatalog.qaCatalogUpload(values.file, values.name);
    },
    onSuccess: (catalog) => {
      toast.success(texts.evals.qaCatalog.createSuccess);
      onCreated?.();
      onClose();
      void navigate(`/admin/evals/qa-catalogs/${catalog.id}`);
    },
  });

  const handleEmptySubmit = emptyForm.onSubmit((values) => {
    void createEmptyMutation.mutate(values);
  });

  const handleUploadSubmit = uploadForm.onSubmit((values) => {
    void uploadMutation.mutate(values);
  });

  const isPending = createEmptyMutation.isPending || uploadMutation.isPending;
  const error = activeTab === 'empty' ? createEmptyMutation.error : uploadMutation.error;

  return (
    <Portal>
      <form
        noValidate
        onSubmit={(e) => {
          if (activeTab === 'empty') {
            handleEmptySubmit(e);
          } else if (activeTab === 'upload') {
            handleUploadSubmit(e);
          } else {
            e.preventDefault();
          }
        }}
      >
        <Modal
          onClose={onClose}
          header={texts.evals.qaCatalog.createTitle}
          footer={
            <fieldset disabled={isPending}>
              <div className="flex flex-row justify-end gap-4">
                <Button type="button" variant="subtle" onClick={onClose}>
                  {texts.common.cancel}
                </Button>
                {activeTab === 'empty' && (
                  <Button type="submit" loading={createEmptyMutation.isPending}>
                    {texts.evals.qaCatalog.create}
                  </Button>
                )}
                {activeTab === 'upload' && (
                  <Button type="submit" loading={uploadMutation.isPending}>
                    {texts.evals.qaCatalog.create}
                  </Button>
                )}
              </div>
            </fieldset>
          }
        >
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="empty" leftSection={<IconFile size={16} />}>
                {texts.evals.qaCatalog.createTabEmpty}
              </Tabs.Tab>
              <Tabs.Tab value="upload" leftSection={<IconFileUpload size={16} />}>
                {texts.evals.qaCatalog.createTabUpload}
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="empty" pt="md">
              <fieldset disabled={createEmptyMutation.isPending}>
                <FormAlert common={texts.evals.qaCatalog.createFailed} error={error} />

                <p className="mb-4 text-sm text-gray-500">{texts.evals.qaCatalog.createEmptyDescription}</p>

                <TextInput
                  id="empty-name"
                  withAsterisk
                  label={texts.evals.qaCatalog.catalogName}
                  placeholder={texts.evals.qaCatalog.catalogNamePlaceholder}
                  className="mb-4"
                  key={emptyForm.key('name')}
                  {...emptyForm.getInputProps('name')}
                />
              </fieldset>
            </Tabs.Panel>

            <Tabs.Panel value="upload" pt="md">
              <fieldset disabled={uploadMutation.isPending}>
                <FormAlert common={texts.evals.qaCatalog.createFailed} error={error} />

                <TextInput
                  id="upload-name"
                  withAsterisk
                  label={texts.evals.qaCatalog.catalogName}
                  placeholder={texts.evals.qaCatalog.catalogNamePlaceholder}
                  className="mb-4"
                  key={uploadForm.key('name')}
                  {...uploadForm.getInputProps('name')}
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
                  key={uploadForm.key('file')}
                  {...uploadForm.getInputProps('file')}
                />
              </fieldset>
            </Tabs.Panel>
          </Tabs>
        </Modal>
      </form>
    </Portal>
  );
}
