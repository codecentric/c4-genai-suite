import { ActionIcon, Menu } from '@mantine/core';
import { IconCopy, IconDots, IconDownload, IconEdit, IconTrash } from '@tabler/icons-react';
import { memo } from 'react';
import { toast } from 'react-toastify';
import { ConfigurationDto, useApi } from 'src/api';
import { ConfirmDialog, TransientNavLink } from 'src/components';
import { cn } from 'src/lib';
import { texts } from 'src/texts';

interface ConfigurationProps {
  // The configuration to render.
  configuration: ConfigurationDto;

  // Invoked when deleted.
  onDelete: (configuration: ConfigurationDto) => void;

  // Invoked when updating.
  onUpdate: (configuration: ConfigurationDto) => void;

  onDuplicate: (configuration: ConfigurationDto) => void;
}

export const Configuration = memo((props: ConfigurationProps) => {
  const { configuration, onDelete, onUpdate, onDuplicate } = props;
  const api = useApi();

  const handleExport = async () => {
    try {
      const exportedData = await api.extensions.exportConfiguration(configuration.id);

      // Sanitize filename: keep alphanumerics, hyphens, underscores, spaces
      const sanitizedName = configuration.name.replace(/[^a-zA-Z0-9\-_ ]/g, '_');
      const filename = `${sanitizedName}_config.json`;

      // Create blob and download
      const blob = new Blob([JSON.stringify(exportedData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(texts.extensions.exportConfigurationSuccess);
    } catch (_error) {
      toast.error(texts.extensions.exportConfigurationFailed);
    }
  };

  return (
    <li className="group flex items-center !px-0">
      <TransientNavLink
        data-text={configuration.name}
        className={cn('text-normal block min-w-0 grow truncate text-ellipsis', { 'opacity-25': !configuration.enabled })}
        to={`/admin/assistants/${configuration.id}`}
      >
        {configuration.name}
      </TransientNavLink>
      <Menu>
        <Menu.Target>
          <ActionIcon className="opacity-0 group-hover:opacity-100" variant="subtle" data-testid={'more-actions'}>
            <IconDots size={16} />
          </ActionIcon>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => onUpdate(configuration)}>
            {texts.common.edit}
          </Menu.Item>
          <Menu.Item leftSection={<IconCopy size={14} />} onClick={() => onDuplicate(configuration)}>
            {texts.common.duplicate}
          </Menu.Item>
          <Menu.Item leftSection={<IconDownload size={14} />} onClick={handleExport}>
            {texts.common.export}
          </Menu.Item>
          <ConfirmDialog
            title={texts.extensions.removeConfigurationConfirmTitle}
            text={texts.extensions.removeConfigurationConfirmText}
            onPerform={() => onDelete(configuration)}
          >
            {({ onClick }) => (
              <Menu.Item onClick={onClick} color="red" leftSection={<IconTrash size={14} />}>
                {texts.common.remove}
              </Menu.Item>
            )}
          </ConfirmDialog>
        </Menu.Dropdown>
      </Menu>
    </li>
  );
});
