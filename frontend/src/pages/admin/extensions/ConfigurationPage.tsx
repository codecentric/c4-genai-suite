import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Route, Routes } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ConfigurationDto, ExportedConfigurationDto, useApi } from 'src/api';
import { Icon, Page } from 'src/components';
import { useEventCallback, useTransientNavigate } from 'src/hooks';
import { buildError } from 'src/lib';
import { texts } from 'src/texts';
import { Configuration } from './Configuration.tsx';
import { EmptyPage } from './EmptyPage';
import { ExtensionsPage } from './ExtensionsPage';
import { UpsertConfigurationDialog } from './UpsertConfigurationDialog.tsx';
import { useConfigurationStore } from './state';

export function ConfigurationPage() {
  const api = useApi();
  const { i18n } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigate = useTransientNavigate();
  const [toCreate, setToCreate] = useState<boolean>();
  const [toUpdate, setToUpdate] = useState<ConfigurationDto | null>(null);
  const { configurations, removeConfiguration, setConfiguration, setConfigurations } = useConfigurationStore();

  const { data: loadedConfigurations, isFetched } = useQuery({
    queryKey: [`configurations_${i18n.language}`],
    queryFn: () => api.extensions.getConfigurations(),
  });

  useEffect(() => {
    if (loadedConfigurations) {
      setConfigurations(loadedConfigurations.items);
    }
  }, [loadedConfigurations, setConfigurations]);

  const deleting = useMutation({
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

  const duplicate = useMutation({
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

  const importConfig = useMutation({
    mutationFn: (data: ExportedConfigurationDto) => {
      return api.extensions.importConfiguration({ data });
    },
    onSuccess: (configuration) => {
      setConfiguration(configuration);
      setToUpdate(configuration);

      toast.success(texts.extensions.importConfigurationSuccess);
      navigate(`/admin/assistants/${configuration.id}`);
    },
    onError: async (error) => {
      toast.error(await buildError(texts.extensions.importConfigurationFailed, error));
    },
  });

  const doCreate = useEventCallback((configuration: ConfigurationDto) => {
    setConfiguration(configuration);
    navigate(`/admin/assistants/${configuration.id}`);
  });

  const doClose = useEventCallback(() => {
    setToUpdate(null);
    setToCreate(false);
  });

  const handleFileChange = useEventCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let data: ExportedConfigurationDto;
      try {
        data = JSON.parse(text) as ExportedConfigurationDto;
      } catch {
        toast.error(texts.extensions.importConfigurationInvalidJson);
        return;
      }
      importConfig.mutate(data);
    } catch (error) {
      // Handle file reading errors
      toast.error(await buildError(texts.extensions.importConfigurationFailed, error as Error));
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  });

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Page
      menu={
        <div className="flex flex-col overflow-y-hidden">
          <div className="flex gap-x-2 p-8 pb-4">
            <h3 id={texts.extensions.configurations} className="grow text-xl">
              {texts.extensions.configurations}
            </h3>

            <button
              className="btn btn-square btn-sm text-sm"
              onClick={handleImportClick}
              title={texts.extensions.importConfiguration}
            >
              <Icon icon="arrow-up" size={16} />
            </button>

            <button className="btn btn-square btn-sm text-sm" onClick={() => setToCreate(true)}>
              <Icon icon="plus" size={16} />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          <div className="grow overflow-y-auto p-4 pt-4">
            <div aria-labelledby={texts.extensions.configurations} className="nav-menu flex flex-col">
              {configurations.map((configuration) => (
                <Configuration
                  key={configuration.id}
                  configuration={configuration}
                  onDelete={deleting.mutate}
                  onUpdate={setToUpdate}
                  onDuplicate={duplicate.mutate}
                />
              ))}
            </div>

            {configurations.length === 0 && isFetched && (
              <div className="pt-4 text-sm text-gray-400">{texts.extensions.configurationsEmpty}</div>
            )}
          </div>
        </div>
      }
    >
      <Routes>
        <Route path=":id" element={<ExtensionsPage />} />
        <Route path="" element={<EmptyPage />} />
      </Routes>

      {(toCreate || toUpdate) && (
        <UpsertConfigurationDialog onClose={doClose} onCreate={doCreate} onUpdate={setConfiguration} target={toUpdate} />
      )}
    </Page>
  );
}
