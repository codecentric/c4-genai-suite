import { Button, Fieldset, Tabs } from '@mantine/core';
import { IconBlocks, IconBrain, IconCopy, IconEdit, IconPlus, IconTool, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useApi } from 'src/api';
import { BucketDto, ConfigurationDto, ExtensionDto } from 'src/api/generated';
import { Alert, ConfirmDialog, Icon } from 'src/components';
import { useEventCallback, useTransientNavigate } from 'src/hooks';
import { buildError } from 'src/lib';
import { Argument } from 'src/pages/admin/extensions/ExtensionForm';
import { texts } from 'src/texts';
import { ExtensionCard } from './ExtensionCard';
import { UpsertConfigurationDialog } from './UpsertConfigurationDialog';
import { UpsertExtensionDialog } from './UpsertExtensionDialog';
import { useConfigurationStore, useExtensionsStore } from './state';

const EMPTY_BUCKETS: BucketDto[] = [];

export function ExtensionsPage() {
  const api = useApi();

  const [activeTab, setActiveTab] = useState<string | null>('models');

  const configurationParam = useParams<'id'>();
  const configurationId = +configurationParam.id!;
  const [toCreate, setToCreate] = useState<boolean>();
  const [toUpdate, setToUpdate] = useState<ExtensionDto | null>();
  const { extensions, specs, removeExtension, setExtension, setExtensions } = useExtensionsStore();

  const navigate = useTransientNavigate();
  const [toUpdateConfiguration, setToUpdateConfiguration] = useState<boolean>();
  const [thisConfiguration, setThisConfiguration] = useState<ConfigurationDto | null>(null);
  const { configurations, removeConfiguration, setConfiguration } = useConfigurationStore();

  const { data: configuration } = useQuery({
    queryKey: ['configuration', configurationId],
    queryFn: () => api.extensions.getConfiguration(configurationId),
  });

  useEffect(() => {
    if (configuration) {
      const updatedConfiguration = configurations.find((c) => c.id == configuration.id);
      if (updatedConfiguration) {
        setThisConfiguration(updatedConfiguration);
      }
    }
  }, [configuration, configurations]);

  const deletingConfiguration = useMutation({
    mutationFn: (configuration: ConfigurationDto) => {
      return api.extensions.deleteConfiguration(configuration.id);
    },
    onSuccess: (_, configuration) => {
      removeConfiguration(configuration.id);
      navigate('/admin/assistants/');
    },
    onError: async (error) => {
      toast.error(await buildError(texts.extensions.removeConfigurationFailed, error));
    },
  });

  const duplicateConfiguration = useMutation({
    mutationFn: (configuration: ConfigurationDto) => {
      return api.extensions.duplicateConfiguration(configuration.id);
    },
    onSuccess: (configuration) => {
      setConfiguration(configuration);
      navigate(`/admin/assistants/${configuration.id}`);
    },
    onError: async (error) => {
      toast.error(await buildError(texts.extensions.duplicateConfigurationFailed, error));
    },
  });

  const doCloseConfiguration = useEventCallback(() => {
    setToUpdateConfiguration(false);
  });

  const { data: loadedBuckets } = useQuery({
    queryKey: ['buckets'],
    queryFn: () => api.files.getBuckets(),
  });

  const { data: loadedExtensions, isFetched } = useQuery({
    queryKey: ['extensions', configurationId],
    queryFn: () => api.extensions.getExtensions(configurationId),
  });

  useEffect(() => {
    if (loadedExtensions) {
      setExtensions(loadedExtensions.configured, loadedExtensions.specs);
    }
  }, [loadedExtensions, setExtensions]);

  const deleting = useMutation({
    mutationFn: (extension: ExtensionDto) => {
      return api.extensions.deleteExtension(configurationId, extension.id);
    },
    onSuccess: (_, extension) => {
      removeExtension(extension.id);
    },
    onError: async (error) => {
      toast.error(await buildError(texts.extensions.removeExtensionFailed, error));
    },
  });

  const doClose = useEventCallback(() => {
    setToUpdate(null);
    setToCreate(false);
  });

  const findAllIncompatibleTools = (tool: ExtensionDto, allTools: ExtensionDto[]) => {
    const group = tool.spec.group;
    const whitelist = tool.spec.groupWhitelist;

    if (!group) {
      return [];
    }

    return allTools
      .filter((t) => t !== tool) // a tool is never incompatible with itself
      .filter((t) => t.enabled) // a tool is never incompatible with a deactivated tool
      .filter((t) => t.spec.group === group) // a tool is only incompatible with tools of the same group
      .filter((t) => !whitelist?.includes(t.spec.name)); // whitelisted tools are compatible
  };

  function filterPermutations(pairs: [string, string][]): [string, string][] {
    const seenPairs = new Set<string>();
    return pairs.filter((pair) => {
      const sortedPair = pair.slice().sort().join(',');
      if (seenPairs.has(sortedPair)) {
        return false;
      } else {
        seenPairs.add(sortedPair);
        return true;
      }
    });
  }

  const buckets = loadedBuckets?.items || EMPTY_BUCKETS;
  const asTools = extensions.filter((e) => e.spec.type === 'tool');
  const asOthers = extensions.filter((e) => e.spec.type === 'other');
  const asModels = extensions.filter((e) => e.spec.type === 'llm');
  const numModels = asModels.filter((e) => e.enabled).length;
  const incompatibleToolPairs = asTools
    .filter((tool) => tool.enabled)
    .flatMap((tool) => findAllIncompatibleTools(tool, asTools).map((incompatibleTool) => [tool, incompatibleTool]));
  const incompatibleToolPairsNames = filterPermutations(
    incompatibleToolPairs.map(([tool, otherTool]) => [tool.spec.title, otherTool.spec.title]),
  );

  const form = useForm<Record<string, unknown>>({});

  return (
    <>
      {thisConfiguration && (
        <>
          <div className="flex flex-col gap-8">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-y-2">
                <div className="flex items-center gap-x-4">
                  <h2 className="text-3xl">{thisConfiguration.name}</h2>
                </div>
                <div className="text-gray-400">{thisConfiguration.description}</div>
              </div>

              <div className="flex gap-2">
                <Button leftSection={<IconEdit size={20} />} onClick={() => setToUpdateConfiguration(true)}>
                  {texts.common.edit}
                </Button>
                <Button leftSection={<IconCopy size={20} />} onClick={() => duplicateConfiguration.mutate(thisConfiguration)}>
                  {texts.common.duplicate}
                </Button>
                <ConfirmDialog
                  title={texts.extensions.removeConfigurationConfirmTitle}
                  text={texts.extensions.removeConfigurationConfirmText}
                  onPerform={() => deletingConfiguration.mutate(thisConfiguration)}
                >
                  {({ onClick }) => (
                    <Button variant="light" onClick={onClick} color="red" leftSection={<IconTrash size={20} />}>
                      {texts.common.remove}
                    </Button>
                  )}
                </ConfirmDialog>
              </div>
            </div>
            <div className="mt-4 flex">
              <h2 className="grow text-2xl">{texts.extensions.headline}</h2>
              <Button leftSection={<IconPlus />} onClick={() => setToCreate(true)}>
                {texts.extensions.add}
              </Button>
            </div>

            <div>
              <Tabs
                variant="outline"
                radius="lg"
                onChange={setActiveTab}
                value={activeTab}
                classNames={{ tab: 'custom-tab', tabLabel: 'custom-tabLabel', panel: 'custom-tab-panel' }}
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
                  {numModels === 0 && isFetched && <Alert text={texts.extensions.warningNoModel} />}

                  {numModels > 1 && isFetched && <Alert text={texts.extensions.warningTooManyModels} />}

                  <ul aria-label={'extensionList'} className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {asModels.map((extension) => (
                      <ExtensionCard
                        key={extension.id}
                        buckets={buckets}
                        extension={extension}
                        onClick={(_, extension) => setToUpdate(extension)}
                        onDelete={deleting.mutate}
                        spec={extension.spec}
                      />
                    ))}
                  </ul>
                </Tabs.Panel>
                <Tabs.Panel value="tools">
                  {asTools.length == 0 && isFetched && <div className="p-2 text-sm">{texts.extensions.noTools}</div>}

                  {incompatibleToolPairsNames.map(([title, other]) => (
                    <div
                      key={title + other}
                      role="alert"
                      className="alert alert-warning"
                      aria-label={'warning'}
                      data-testid="incompatibleToolAlert"
                    >
                      <Icon icon="alert" />
                      <span>{texts.extensions.warningIncompatibleFilesTools(title, other)}</span>
                    </div>
                  ))}

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {asTools.map((extension) => (
                      <ExtensionCard
                        key={extension.id}
                        buckets={buckets}
                        extension={extension}
                        onClick={(_, extension) => setToUpdate(extension)}
                        onDelete={deleting.mutate}
                        spec={extension.spec}
                      />
                    ))}
                  </div>
                </Tabs.Panel>
                <Tabs.Panel value="others">
                  {asOthers.length == 0 && isFetched && <div className="p-2 text-sm">{texts.extensions.noOthers}</div>}

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {asOthers.map((extension) => (
                      <ExtensionCard
                        key={extension.id}
                        buckets={buckets}
                        extension={extension}
                        onClick={(_, extension) => setToUpdate(extension)}
                        onDelete={deleting.mutate}
                        spec={extension.spec}
                      />
                    ))}
                  </div>
                </Tabs.Panel>
              </Tabs>
            </div>

            {extensions.some((x) => x.configurableArguments) && (
              <FormProvider {...form}>
                <form>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xl">{texts.common.configurableArguments}</h3>

                    {extensions
                      .filter((x) => x.configurableArguments)
                      .map((x) => (
                        <Fieldset
                          key={x.id}
                          legend={
                            <div className="flex items-center">
                              <h4 className="mr-2.5 font-bold">{x.configurableArguments?.title}</h4>
                              <p className="text-xs">{x.configurableArguments?.description}</p>
                            </div>
                          }
                        >
                          {Object.entries(x.configurableArguments!.properties).map(([name, spec]) => (
                            <Argument
                              namePrefix={`${x.id}.`}
                              refreshable
                              vertical
                              key={`${x.id}-${name}`}
                              buckets={[]}
                              name={name}
                              argument={spec}
                            />
                          ))}
                        </Fieldset>
                      ))}
                  </div>
                </form>
              </FormProvider>
            )}
          </div>

          {(toCreate || toUpdate) && (
            <UpsertExtensionDialog
              selected={toUpdate ?? undefined}
              buckets={buckets}
              configurationId={configurationId}
              onClose={doClose}
              onCreate={setExtension}
              onDelete={removeExtension}
              onUpdate={setExtension}
              specs={specs}
            />
          )}
          {toUpdateConfiguration && (
            <UpsertConfigurationDialog
              onClose={doCloseConfiguration}
              onCreate={() => {}}
              target={thisConfiguration}
              onUpdate={setConfiguration}
            />
          )}
        </>
      )}
    </>
  );
}
