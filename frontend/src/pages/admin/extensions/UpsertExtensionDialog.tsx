import { Alert, Button, Divider, Portal, Tabs } from '@mantine/core';
import { IconBlocks, IconBrain, IconInfoCircle, IconRefresh, IconTool, IconTrash } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import {
  BucketDto,
  CreateExtensionDto,
  ExtensionDto,
  ExtensionSpecDto,
  TestExtensionDto,
  UpdateExtensionDto,
  useApi,
} from 'src/api';
import { ConfirmDialog, FormAlert, Forms, Modal } from 'src/components';
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
      form.reset({}, { keepValues: true });
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
  const resolver = useSpecResolver(spec);

  const defaultValues = selected ?? { enabled: true, values: {} };
  const form = useForm<CreateExtensionDto>({
    resolver,
    defaultValues,
  });

  const rebuildTriggered = useRef(false);
  useEffect(() => {
    if (selected && spec?.triggers && !rebuildTriggered.current) {
      rebuild.mutate(form.getValues());
      rebuildTriggered.current = true;
    }
  }, [spec, selected, rebuild, form]);

  useEffect(() => {
    if (spec) {
      form.setValue('name', spec.name);
    }
  }, [spec, form]);

  const asTools = specs.filter((x) => x.type === 'tool');
  const asOthers = specs.filter((x) => x.type === 'other');
  const asModels = specs.filter((x) => x.type === 'llm');

  const modified = spec?.triggers?.some((x) => form.formState.dirtyFields.values?.[x as keyof CreateExtensionDto['values']]);

  return (
    <Portal>
      <FormProvider {...form}>
        <form noValidate onSubmit={form.handleSubmit((v) => (selected ? updating.mutate(v) : creating.mutate(v)))}>
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
                      {spec.testable ? <TestButton extensionId={selected?.id} /> : <div />}
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
                          onClick={form.handleSubmit((v) => rebuild.mutate(v))}
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
                  <ExtensionForm buckets={buckets} spec={spec} />

                  {selected && <Divider my="xs" label={texts.common.dangerZone} labelPosition="left" />}

                  {selected && (
                    <Forms.Row name="danger" label={texts.common.remove}>
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
                    </Forms.Row>
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
      </FormProvider>
    </Portal>
  );
}
