import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Portal } from '@mantine/core';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { BucketDto, BucketDtoTypeEnum, UpsertBucketDto, useApi } from 'src/api';
import { FormAlert, Forms, Modal } from 'src/components';
import { buildError } from 'src/lib';
import { texts } from 'src/texts';
import { TestButton } from './TestButton';

function debounce<F extends (...args: never[]) => void>(func: F, wait: number): (...args: Parameters<F>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return function (...args: Parameters<F>) {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

const SCHEME = z.object({
  name: z.string().min(1, texts.common.name),
  endpoint: z.string().min(1, texts.common.endpoint),
  allowedFileNameExtensions: z.array(z.string()).min(1),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RESOLVER = zodResolver(SCHEME) as any;

interface UpsertBucketDialogProps {
  // The bucket to update.
  target?: BucketDto | null;

  // Invoked when cancelled.
  onClose: () => void;

  // Invoked when created.
  onCreate: (bucket: BucketDto) => void;

  // Invoked when updated.
  onUpdate: (bucket: BucketDto) => void;
}

export function UpsertBucketDialog(props: UpsertBucketDialogProps) {
  const { onClose, onCreate, onUpdate, target } = props;

  const api = useApi();

  const creating = useMutation({
    mutationFn: (request: UpsertBucketDto) => {
      return api.files.postBucket(request);
    },
    onSuccess: (response) => {
      onCreate(response);
      onClose();
    },
  });

  const updating = useMutation({
    mutationFn: (request: UpsertBucketDto) => {
      return api.files.putBucket(target!.id, request);
    },
    onSuccess: (response) => {
      onUpdate(response);
      onClose();
    },
    onError: async (error) => {
      toast.error(await buildError(texts.theme.updateFailed, error));
    },
  });

  const form = useForm<UpsertBucketDto>({
    resolver: RESOLVER,
    defaultValues: target ?? {
      isDefault: false,
      perUserQuota: 20,
      allowedFileNameExtensions: [],
      fileSizeLimits: { general: 1, pdf: 10, pptx: 10 },
    },
  });
  const watchIsUser = form.watch('type') === 'user';

  const [{ endpoint, headers }, setConnection] = useState(target ?? { endpoint: '', headers: '' });

  const { data: fileTypes, error: fileTypesFetchError } = useQuery({
    queryKey: [`fileTypes:${endpoint}:${headers}`],
    queryFn: () => api.files.getFileTypes(endpoint, headers),
    enabled: !!endpoint,
    retry: false,
  });

  const bucketTypeOptions = Object.values(BucketDtoTypeEnum).map((value) => ({ label: value, value }));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debounceFn = useMemo(() => debounce(handleDebounceFn, 500), []);

  function handleDebounceFn(event: ChangeEvent<HTMLInputElement>) {
    const key = event.target.name as keyof UpsertBucketDto;
    const newValue = event.target.value;
    setConnection({ endpoint, headers, [key]: newValue });
    form.setValue('allowedFileNameExtensions', []);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const key = event.target.name as keyof UpsertBucketDto;
    form.setValue(key, event.target.value);
    debounceFn(event);
  }

  useEffect(() => {
    if (fileTypesFetchError) {
      form.setError('endpoint', {
        type: 'manual',
        message: texts.files.invalidEndpointError,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileTypesFetchError]);

  useEffect(() => {
    const allowedFileNameExtensions = form.getValues('allowedFileNameExtensions');
    if (!allowedFileNameExtensions?.length) {
      form.clearErrors('endpoint');
      form.setValue('allowedFileNameExtensions', fileTypes?.items.map((x) => x.value) ?? [], { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileTypes]);

  const isDisabled = !form.formState.isValid || creating.isPending || updating.isPending;

  return (
    <Portal>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit((v) => (target ? updating.mutate(v) : creating.mutate(v)))}>
          <Modal
            onClose={onClose}
            header={<div className="flex items-center gap-4">{target ? texts.files.updateBucket : texts.files.createBucket}</div>}
            footer={
              <fieldset disabled={updating.isPending || creating.isPending}>
                <div className="flex flex-row justify-between">
                  <TestButton />
                  <div className="flex flex-row gap-2">
                    <Button type="button" variant={'subtle'} onClick={onClose}>
                      {texts.common.cancel}
                    </Button>
                    <Button type="submit" disabled={isDisabled}>
                      {texts.common.save}
                    </Button>
                  </div>
                </div>
              </fieldset>
            }
          >
            <fieldset disabled={updating.isPending || creating.isPending}>
              <FormAlert
                common={target ? texts.files.updateBucketFailed : texts.files.createBucketFailed}
                error={target ? updating.error : creating.error}
              />

              <Forms.Text vertical name="name" label={texts.common.name} autoFocus required />

              <Forms.Text
                vertical
                name="indexName"
                label={texts.common.indexName}
                placeholder="[use default index name]"
                hints="Only change the default index name if you are sure you need a separate index."
              />

              <Forms.Url vertical name="endpoint" label={texts.common.endpoint} onChange={handleChange} required />

              <Forms.Textarea vertical name="headers" label={texts.common.headers} onChange={handleChange} />

              {!target && (
                <Forms.Select options={bucketTypeOptions} vertical name="type" label={texts.files.bucketType} required />
              )}

              {watchIsUser && <Forms.Number vertical name="perUserQuota" label={texts.files.perUserQuota} />}

              <Forms.Select
                options={fileTypes?.items ?? []}
                multiple={true}
                disabled={!fileTypes?.items?.length}
                vertical
                name="allowedFileNameExtensions"
                label={texts.files.allowedFileTypes}
                defaultValue={fileTypes?.items.map((x) => x.value)}
                required
              />

              <Forms.FileSizeDynamicFields name="fileSizeLimits" label={texts.files.fileSizeLimits} suffix="MB" />
            </fieldset>
          </Modal>
        </form>
      </FormProvider>
    </Portal>
  );
}
