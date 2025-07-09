import { Button, Fieldset } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useApi } from 'src/api';
import { BucketDto, ExtensionDto } from 'src/api/generated';
import { Alert, Icon } from 'src/components';
import { useEventCallback } from 'src/hooks';
import { buildError } from 'src/lib';
import { Argument } from 'src/pages/admin/extensions/ExtensionForm';
import { texts } from 'src/texts';
import { ExtensionCard } from './ExtensionCard';
import { UpsertExtensionDialog } from './UpsertExtensionDialog';
import { useExtensionsStore } from './state';

const EMPTY_BUCKETS: BucketDto[] = [];

export function ExtensionsPage() {
  const api = useApi();

  const configurationParam = useParams<'id'>();
  const configurationId = +configurationParam.id!;
  const [searchParams, setSearchParams] = useSearchParams();

  const setToCreate = (paramExists: boolean) => {
    const newParams = new URLSearchParams(searchParams);
    if (paramExists) {
      newParams.set('add-extension', 'true');
    } else {
      newParams.delete('add-extension');
    }
    setSearchParams(newParams);
  };
  const toCreate = searchParams.has('add-extension');

  const [toUpdate, setToUpdate] = useState<ExtensionDto | null>();
  const { extensions, specs, removeExtension, setExtension, setExtensions } = useExtensionsStore();

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
      <div className="flex flex-col gap-8">
        <div className="flex">
          <h2 className="grow text-2xl">{texts.extensions.headline}</h2>

          <Button leftSection={<IconPlus />} onClick={() => setToCreate(true)}>
            {texts.extensions.add}
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-xl">{texts.extensions.typeModels}</h3>

          {numModels === 0 && isFetched && (
            <Alert text={texts.extensions.warningNoModel}>
              <Button color="red" variant="light" size="compact-xs" mt="sm" onClick={() => setToCreate(true)}>
                {texts.extensions.add}
              </Button>
            </Alert>
          )}

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
        </div>

        {asOthers.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xl">{texts.extensions.typeOther}</h3>

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
          </div>
        )}

        {asTools.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xl">{texts.extensions.typeTools}</h3>

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
          </div>
        )}

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
    </>
  );
}
