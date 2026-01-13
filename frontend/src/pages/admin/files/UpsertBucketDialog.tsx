import { Button, MultiSelect, NumberInput, Portal, Select, Textarea, TextInput } from '@mantine/core';
import { useForm, UseFormReturnType } from '@mantine/form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { BucketDto, BucketDtoFileSizeLimits, BucketDtoTypeEnum, UpsertBucketDto, useApi } from 'src/api';
import { FormAlert, Icon, Modal } from 'src/components';
import { buildError, cn } from 'src/lib';
import { texts } from 'src/texts';

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
    validate: zod4Resolver(SCHEME) as unknown as (values: UpsertBucketDto) => Record<string, string | null>,
    initialValues: (target as UpsertBucketDto) ?? {
      name: '',
      endpoint: '',
      indexName: '',
      headers: '',
      isDefault: false,
      perUserQuota: 20,
      allowedFileNameExtensions: [],
      fileSizeLimits: { general: 1, pdf: 10, pptx: 10 },
    },
    mode: 'uncontrolled',
  });
  const watchIsUser = form.getValues().type === 'user';

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

  function handleDebounceFn(key: string, newValue: string) {
    setConnection({ endpoint, headers, [key]: newValue });
    form.setFieldValue('allowedFileNameExtensions', []);
  }

  function handleEndpointChange(newValue: string) {
    form.setFieldValue('endpoint', newValue);
    debounceFn('endpoint', newValue);
  }

  function handleHeadersChange(newValue: string) {
    form.setFieldValue('headers', newValue);
    debounceFn('headers', newValue);
  }

  useEffect(() => {
    if (fileTypesFetchError) {
      form.setFieldError('endpoint', texts.files.invalidEndpointError);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileTypesFetchError]);

  useEffect(() => {
    const allowedFileNameExtensions = form.getValues().allowedFileNameExtensions;
    if (!allowedFileNameExtensions?.length) {
      form.clearFieldError('endpoint');
      form.setFieldValue('allowedFileNameExtensions', fileTypes?.items.map((x) => x.value) ?? []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileTypes]);

  const isDisabled = !form.isValid() || creating.isPending || updating.isPending;

  return (
    <Portal>
      <form onSubmit={form.onSubmit((v) => (target ? updating.mutate(v) : creating.mutate(v)))}>
        <Modal
          onClose={onClose}
          header={<div className="flex items-center gap-4">{target ? texts.files.updateBucket : texts.files.createBucket}</div>}
          footer={
            <fieldset disabled={updating.isPending || creating.isPending}>
              <div className="flex flex-row justify-end gap-2">
                <Button type="button" variant={'subtle'} onClick={onClose}>
                  {texts.common.cancel}
                </Button>
                <Button type="submit" disabled={isDisabled}>
                  {texts.common.save}
                </Button>
              </div>
            </fieldset>
          }
        >
          <fieldset disabled={updating.isPending || creating.isPending}>
            <FormAlert
              common={target ? texts.files.updateBucketFailed : texts.files.createBucketFailed}
              error={target ? updating.error : creating.error}
            />

            <TextInput
              label={texts.common.name}
              autoFocus
              required
              key={form.key('name')}
              {...form.getInputProps('name')}
              mb="sm"
            />

            <TextInput
              label={texts.common.indexName}
              placeholder="[use default index name]"
              description="Only change the default index name if you are sure you need a separate index."
              key={form.key('indexName')}
              {...form.getInputProps('indexName')}
              mb="sm"
            />

            <TextInput
              label={texts.common.endpoint}
              type="url"
              required
              key={form.key('endpoint')}
              {...form.getInputProps('endpoint')}
              onChange={(e) => handleEndpointChange(e.target.value)}
              mb="sm"
            />

            <Textarea
              label={texts.common.headers}
              key={form.key('headers')}
              {...form.getInputProps('headers')}
              onChange={(e) => handleHeadersChange(e.target.value)}
              mb="sm"
            />

            {!target && (
              <Select
                data={bucketTypeOptions}
                label={texts.files.bucketType}
                required
                key={form.key('type')}
                {...form.getInputProps('type')}
                mb="sm"
              />
            )}

            {watchIsUser && (
              <NumberInput
                label={texts.files.perUserQuota}
                key={form.key('perUserQuota')}
                {...form.getInputProps('perUserQuota')}
                mb="sm"
              />
            )}

            <MultiSelect
              data={fileTypes?.items ?? []}
              disabled={!fileTypes?.items?.length}
              label={texts.files.allowedFileTypes}
              required
              key={form.key('allowedFileNameExtensions')}
              {...form.getInputProps('allowedFileNameExtensions')}
              mb="sm"
            />

            <FileSizeDynamicFields form={form} name="fileSizeLimits" label={texts.files.fileSizeLimits} suffix="MB" />
          </fieldset>
        </Modal>
      </form>
    </Portal>
  );
}

interface FileSizeDynamicFieldsProps {
  form: UseFormReturnType<UpsertBucketDto>;
  name: string;
  label: string;
  suffix?: string;
  className?: string;
}

function FileSizeDynamicFields({ form, name: _name, label, suffix, className }: FileSizeDynamicFieldsProps) {
  type DynamicFieldValue = { key: string; value: number }[];
  type FileSizeLimitsValue = { [key: string]: number };

  const [dynamicFields, setDynamicFields] = useState<DynamicFieldValue>([]);
  const [generalValue, setGeneralValue] = useState<number>(1);

  const transformToDynamicField = (fileSizeLimits: FileSizeLimitsValue): { fields: DynamicFieldValue; general: number } => {
    const fields: DynamicFieldValue = Object.entries(fileSizeLimits)
      .filter(([key]) => key !== 'general')
      .map(([key, value]) => ({ key, value }));
    return { fields, general: fileSizeLimits.general ?? 1 };
  };

  const transformToFileSizeLimits = (dynamicField: DynamicFieldValue, general: number): FileSizeLimitsValue => {
    const fileSizeLimits = dynamicField.reduce((acc, field) => {
      if (field.key) {
        acc[field.key.toLowerCase()] = field.value;
      }
      return acc;
    }, {} as FileSizeLimitsValue);
    fileSizeLimits.general = general;
    return fileSizeLimits;
  };

  // populate the dynamic fields with the prefilled values
  useEffect(() => {
    const entries = form.getValues().fileSizeLimits;
    if (entries) {
      const { fields, general } = transformToDynamicField(entries);
      setDynamicFields(fields);
      setGeneralValue(general);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateFormValue = (fields: DynamicFieldValue, general: number) => {
    const fileSizeLimits = transformToFileSizeLimits(fields, general);
    form.setFieldValue('fileSizeLimits', fileSizeLimits as BucketDtoFileSizeLimits);
  };

  const handleAddField = () => {
    const newFields = [...dynamicFields, { key: '', value: 10 }];
    setDynamicFields(newFields);
    updateFormValue(newFields, generalValue);
  };

  const handleRemoveField = (index: number) => {
    const newFields = dynamicFields.filter((_, i) => i !== index);
    setDynamicFields(newFields);
    updateFormValue(newFields, generalValue);
  };

  const handleFieldKeyChange = (index: number, key: string) => {
    const newFields = [...dynamicFields];
    newFields[index] = { ...newFields[index], key };
    setDynamicFields(newFields);
    updateFormValue(newFields, generalValue);
  };

  const handleFieldValueChange = (index: number, value: number) => {
    const newFields = [...dynamicFields];
    newFields[index] = { ...newFields[index], value };
    setDynamicFields(newFields);
    updateFormValue(newFields, generalValue);
  };

  const handleGeneralChange = (value: number) => {
    setGeneralValue(value);
    updateFormValue(dynamicFields, value);
  };

  return (
    <div className={className}>
      <label className="text-sm font-medium">{label}</label>
      <div className="mt-1 space-y-2">
        <div className={cn('form-row flex flex-row items-center space-x-2', className)}>
          <button type="button" data-testid="fileSizeLimitsDynamic.add" onClick={handleAddField}>
            <Icon icon="plus" />
          </button>
          <input placeholder="general" disabled className={cn('input input-bordered w-full', className)} />
          <input
            type="number"
            placeholder="10"
            step="0.1"
            value={generalValue}
            onChange={(e) => handleGeneralChange(parseFloat(e.target.value) || 0)}
            className={cn('input input-bordered w-full', className)}
            data-testid="fileSizeLimitsGeneral.value"
          />
          {suffix && <span>{suffix}</span>}
        </div>
        {dynamicFields.map((field, index) => (
          <div
            key={index}
            className={cn('form-row flex flex-row items-center space-x-2', className)}
            data-testid={`fileSizeLimitsDynamic.${index}.row`}
          >
            <button type="button" data-testid={`fileSizeLimitsDynamic.${index}.remove`} onClick={() => handleRemoveField(index)}>
              <Icon icon="trash" />
            </button>
            <input
              placeholder="pdf"
              value={field.key}
              onChange={(e) => handleFieldKeyChange(index, e.target.value)}
              className={cn('input input-bordered w-full', className)}
              data-testid={`fileSizeLimitsDynamic.${index}.key`}
            />
            <input
              type="number"
              placeholder="10"
              step="0.1"
              required
              value={field.value}
              onChange={(e) => handleFieldValueChange(index, parseFloat(e.target.value) || 0)}
              className={cn('input input-bordered w-full', className)}
              data-testid={`fileSizeLimitsDynamic.${index}.value`}
            />
            {suffix && <span>{suffix}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
