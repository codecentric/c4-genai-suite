import { ActionIcon, Select, SelectProps, Text } from '@mantine/core';
import { IconSettings } from '@tabler/icons-react';
import { useState } from 'react';
import { ConfigurationDto } from 'src/api';
import { ConfigurationUserValuesModal } from 'src/pages/chat/conversation/ConfigurationUserValuesModal';
import { isMobile } from 'src/pages/utils';
import { useStateMutateChat, useStateOfChat } from '../state/chat';

interface ConfigurationProps {
  configuration: ConfigurationDto;
  configurations: ConfigurationDto[];
  canEditConfiguration?: boolean;
}

export const Configuration = ({ canEditConfiguration, configuration, configurations }: ConfigurationProps) => {
  const chat = useStateOfChat();
  const updateChat = useStateMutateChat(chat.id);

  const [showModal, setShowModal] = useState(false);

  const renderSelectOption: SelectProps['renderOption'] = ({ option }) => (
    <div>
      <Text>{option.label}</Text>
      <Text size="xs" c="dimmed">
        {configurations.find((c) => c.id + '' === option.value)?.description}
      </Text>
    </div>
  );

  const close = () => setShowModal(false);

  return (
    <div className="flex flex-row gap-x-4">
      <Select
        className={isMobile() ? 'w-full' : 'max-w-56'}
        radius={'md'}
        comboboxProps={{ radius: 'md' }}
        renderOption={renderSelectOption}
        onChange={(value) => value && updateChat.mutate({ configurationId: +value })}
        value={configuration?.id + ''}
        data={configurations.map((c) => ({ value: c.id + '', label: c.name }))}
        disabled={!canEditConfiguration}
        size="md"
        data-testid="chat-assistent-select"
        scrollAreaProps={{ type: 'always' }}
      />
      {configuration?.configurableArguments && (
        <ActionIcon data-testid="assistent-user-configuration" onClick={() => setShowModal(true)} size="xl" variant="subtle">
          <IconSettings data-testid="configuration-settings-icon" />
        </ActionIcon>
      )}
      {configuration?.configurableArguments && showModal && (
        <ConfigurationUserValuesModal configuration={configuration} onSubmit={close} onClose={close} />
      )}
    </div>
  );
};
