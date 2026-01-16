import { Alert, Button, Divider, Portal, Tabs } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconBlocks, IconBrain, IconInfoCircle, IconRefresh, IconTool, IconTrash } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  BucketDto,
  CreateExtensionDto,
  ExtensionDto,
  ExtensionSpecDto,
  TestExtensionDto,
  UpdateExtensionDto,
  useApi,
} from 'src/api';
import { ConfirmDialog, FormAlert, Modal } from 'src/components';
import { texts } from 'src/texts';
import { ExtensionCard } from './ExtensionCard';
import { ExtensionForm } from './ExtensionForm';
import { TestButton } from './TestButton';
import { useSpecResolver } from './hooks';

interface UpsertExtensionDialogProps {
  buckets: BucketDto[];
  specs: ExtensionSpecDto[];
  configurationId: number;
  onClose: () => void;
  onCreate: (extension: ExtensionDto) => void;
  onUpdate: (extension: ExtensionDto) => void;
  selected?: ExtensionDto;
  onDelete?: (id: number) => void;
}

export function UpsertExtensionDialog(props: UpsertExtensionDialogProps) {
  const { buckets, configurationId, onCreate, onUpdate, onDelete, onClose, specs, selected } = props;

  const api = useApi();

  const [spec, setSpec] = useState<ExtensionSpecDto | undefined>(selected?.spec);
  const [specChanged, setSpecChanged] = useState<boolean>(selected?.changed ?? false);

  const rebuild = useMutation({
    mutationFn: (values: TestExtensionDto) => {
      return api.extensions.rebuildExtension({ ...values, id: selected?.id });
    },
    onSuccess: (extension) => {
      setSpec(extension.spec);
      setSpecChanged(extension.changed);
      form.resetDirty();
    },
  });

  const updating = useMutation({
    mutationFn: (request: UpdateExtensionDto) => {
      return api.extensions.putExtension(configurationId, selected!.id, { ...request });
    },
    onSuccess: (response) => {
      onUpdate(response);
      setSpecChanged(false);
      onClose();
    },
  });

  const creating = useMutation({
    mutationFn: (request: CreateExtensionDto) => {
      return api.extensions.postExtension(configurationId, { ...request, name: spec!.name });
    },
    onSuccess: (response) => {
      onCreate(response);
      setSpecChanged(false);
      onClose();
    },
  });

  const deleting = useMutation({
    mutationFn: () => {
      return selected ? api.extensions.deleteExtension(configurationId, selected.id) : Promise.resolve();
    },
    onSuccess: () => {
      setSpecChanged(false);
      if (selected) {
        onDelete?.(selected.id);
      }
      onClose();
    },
  });
  const resolver = useSpecResolver<CreateExtensionDto>(spec);

  const defaultValues: CreateExtensionDto = selected ?? { name: '', enabled: true, values: {} };
  const form = useForm<CreateExtensionDto>({
    validate: resolver,
    initialValues: defaultValues,
    mode: 'controlled',
  });

  useEffect(() => {
    if (selected) {
      form.setValues(selected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);
  const rebuildTriggered = useRef(false);
  useEffect(() => {
    if (selected && spec?.triggers && !rebuildTriggered.current) {
      rebuild.mutate(form.getValues());
      rebuildTriggered.current = true;
    }
  }, [spec, selected, rebuild, form]);
  // Recursively initialize a value for a given argument spec
  type SchemaArg = {
    _default?: unknown;
    type?: string;
    properties?: Record<string, SchemaArg>;
  };

  function getInitialValue(arg: SchemaArg): unknown {
    if (typeof arg !== 'object' || arg === null) return undefined;
    if (Object.prototype.hasOwnProperty.call(arg, '_default') && arg._default !== undefined) {
      return arg._default;
    }
    if (arg.type === 'object' && arg.properties) {
      const obj: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(arg.properties)) {
        obj[k] = getInitialValue(v);
      }
      return obj;
    }
    if (arg.type === 'array') {
      return [];
    }
    if (arg.type === 'boolean') {
      return undefined;
    }
    if (arg.type === 'number' || arg.type === 'integer') {
      return undefined;
    }
    if (arg.type === 'string') {
      return undefined;
    }
    return undefined;
  }

  useEffect(() => {
    if (spec) {
      // Build the complete values object with all fields from the spec
      const currentFormValues = form.getValues();
      const currentValues = currentFormValues.values ?? {};
      const newValues: Record<string, unknown> = { ...currentValues };

      // Initialize all argument fields from the spec
      if (spec.arguments) {
        Object.entries(spec.arguments).forEach(([key, arg]) => {
          if (newValues[key] === undefined) {
            newValues[key] = getInitialValue(arg);
          }
        });
      }

      // Set all values at once to ensure the form structure is correct
      form.setValues({
        ...currentFormValues,
        name: spec.name,
        values: newValues,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec]);

  const asTools = specs.filter((x) => x.type === 'tool');
  const asOthers = specs.filter((x) => x.type === 'other');
  const asModels = specs.filter((x) => x.type === 'llm');

  const modified = spec?.triggers?.some((x) => form.isDirty(`values.${x}`));

  return (
    <Portal>
      <form
        noValidate
        onSubmit={form.onSubmit((v) => (selected ? updating.mutate(v as UpdateExtensionDto) : creating.mutate(v)))}
      >
        <Modal
          onClose={onClose}
          header={
            <div className="flex items-center gap-4">
              {spec?.logo && <img className="h-6" src={`data:image/svg+xml;utf8,${encodeURIComponent(spec.logo)}`} />}
              {selected && texts.extensions.updateExtension}
              {!selected && texts.extensions.createExtension}
            </div>
          }
          footer={
            spec ? (
              <fieldset disabled={creating.isPending || updating.isPending || rebuild.isPending}>
                <div className="flex flex-row justify-between">
                  <div className="flex flex-row gap-4">
                    {spec.testable ? <TestButton extensionId={selected?.id} form={form} /> : <div />}
                  </div>
                  <div className="flex flex-row gap-4">
                    <Button type="button" variant="subtle" onClick={onClose}>
                      {texts.common.cancel}
                    </Button>
                    {modified && (
                      <Button
                        type="button"
                        variant="outline"
                        data-tooltip-id="default"
                        data-tooltip-content={texts.extensions.testTooltip}
                        onClick={() => form.onSubmit((v) => rebuild.mutate(v as TestExtensionDto))()}
                        loading={rebuild.isPending}
                        disabled={rebuild.isPending}
                      >
                        <IconRefresh size={20} />
                        {texts.extensions.rebuildSchema}
                      </Button>
                    )}
                    {!modified && <Button type="submit">{texts.common.save}</Button>}
                  </div>
                </div>
              </fieldset>
            ) : undefined
          }
        >
          <fieldset disabled={updating.isPending || deleting.isPending || creating.isPending}>
            <FormAlert common={texts.extensions.createExtensionFailed} error={creating.error} />
            <FormAlert common={texts.extensions.updateExtensionFailed} error={updating.error} />
            <FormAlert common={texts.extensions.rebuildSchemaFailed} error={rebuild.error} />
            {specChanged && (
              <Alert variant="light" color="orange" icon={<IconInfoCircle />}>
                {texts.extensions.schemaChanged}
              </Alert>
            )}

            {spec ? (
              <>
                <ExtensionForm buckets={buckets} spec={spec} form={form} />

                {selected && <Divider my="xs" label={texts.common.dangerZone} labelPosition="left" />}

                {selected && (
                  <div className="form-row mb-4 flex flex-row">
                    <label className="mt-3 w-48 shrink-0 text-sm font-semibold">{texts.common.remove}</label>
                    <div className="min-w-0 grow">
                      <ConfirmDialog
                        title={texts.extensions.removeExtensionConfirmText}
                        text={texts.extensions.removeExtensionConfirmText}
                        onPerform={deleting.mutate}
                      >
                        {({ onClick }) => (
                          <Button
                            type="button"
                            variant="light"
                            color="red"
                            leftSection={<IconTrash className="w-4" />}
                            onClick={onClick}
                          >
                            {texts.common.remove}
                          </Button>
                        )}
                      </ConfirmDialog>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col gap-6">
                <Tabs
                  color={'blue'}
                  classNames={{ tabLabel: 'custom-tabLabel', panel: 'dialogue-tab-panel' }}
                  defaultValue={'models'}
                >
                  <Tabs.List grow>
                    <Tabs.Tab value="models" leftSection={<IconBrain size={18} />}>
                      {texts.extensions.typeModels}
                    </Tabs.Tab>
                    <Tabs.Tab value="tools" leftSection={<IconTool size={18} />}>
                      {texts.extensions.typeTools}
                    </Tabs.Tab>
                    <Tabs.Tab value="others" leftSection={<IconBlocks size={18} />}>
                      {texts.extensions.typeOther}
                    </Tabs.Tab>
                  </Tabs.List>
                  <Tabs.Panel value="models">
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                      {asModels.map((spec) => (
                        <ExtensionCard key={spec.name} buckets={buckets} spec={spec} onClick={setSpec} />
                      ))}
                    </div>
                  </Tabs.Panel>
                  <Tabs.Panel value="tools">
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                      {asTools.map((spec) => (
                        <ExtensionCard key={spec.name} buckets={buckets} spec={spec} onClick={setSpec} />
                      ))}
                    </div>
                  </Tabs.Panel>
                  <Tabs.Panel value="others">
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                      {asOthers.map((spec) => (
                        <ExtensionCard key={spec.name} buckets={buckets} spec={spec} onClick={setSpec} />
                      ))}
                    </div>
                  </Tabs.Panel>
                </Tabs>
              </div>
            )}
          </fieldset>
        </Modal>
      </form>
    </Portal>
  );
}
