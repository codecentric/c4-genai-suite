import { ActionIcon, Menu } from '@mantine/core';
import { IconCopy, IconDots, IconEdit, IconTrash } from '@tabler/icons-react';
import { memo } from 'react';
import { ConfigurationDto } from 'src/api';
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

  return (
    <li className="group flex items-center rounded-lg px-2 py-1 hover:bg-gray-100 focus:font-semibold">
      <TransientNavLink
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
