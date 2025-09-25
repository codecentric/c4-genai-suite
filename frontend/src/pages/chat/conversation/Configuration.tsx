import { ActionIcon, Select, SelectProps, Text } from '@mantine/core';
import { IconChevronDown, IconSettings } from '@tabler/icons-react';
import { useState } from 'react';
import { usePersistentState } from 'src/hooks';
import { ConfigurationUserValuesModal } from 'src/pages/chat/conversation/ConfigurationUserValuesModal';
import { useStateOfEnabledAssistants, useStateOfSelectedAssistant } from 'src/pages/chat/state/listOfAssistants';
import { isMobile } from 'src/pages/utils';
import { useStateMutateChat, useStateOfChat } from '../state/chat';

interface ConfigurationProps {
  canEditConfiguration?: boolean;
}

export const Configuration = ({ canEditConfiguration }: ConfigurationProps) => {
  const chat = useStateOfChat();
  const updateChat = useStateMutateChat(chat.id);
  const assistants = useStateOfEnabledAssistants();
  const assistant = useStateOfSelectedAssistant();

  const [showModal, setShowModal] = useState(false);

  const [, setPersistentAssistantId] = usePersistentState<number | null>('selectedAssistantId', null);

  const renderSelectOption: SelectProps['renderOption'] = ({ option }) => (
    <div>
      <Text size="sm">{option.label}</Text>
      <Text size="xs" c="dimmed">
        {assistants.find((c) => c.id + '' === option.value)?.description}
      </Text>
    </div>
  );

  const close = () => setShowModal(false);

  const handleOnChange = (value: string | null) => {
    if (value) {
      updateChat.mutate({ configurationId: +value });
      setPersistentAssistantId(+value);
    }
  };

  return (
    <div className="flex flex-row gap-x-4">
      <Select
        className={isMobile() ? 'w-full' : 'max-w-56'}
        radius={'md'}
        comboboxProps={{
          radius: 'md',
          shadow: 'md',
          position: 'bottom-start',
          width: isMobile() ? '100%' : '280px',
        }}
        maxDropdownHeight={480}
        renderOption={renderSelectOption}
        onChange={handleOnChange}
        value={assistant?.id + ''}
        data={assistants.map((c) => ({ value: c.id + '', label: c.name }))}
        disabled={!canEditConfiguration}
        size="md"
        data-testid="chat-assistent-select"
        scrollAreaProps={{ type: 'always' }}
        rightSection={<IconChevronDown size={16} />}
        searchable
        placeholder="Search assistants..."
      />
      {assistant?.configurableArguments && (
        <ActionIcon data-testid="assistent-user-configuration" onClick={() => setShowModal(true)} size="xl" variant="subtle">
          <IconSettings data-testid="configuration-settings-icon" />
        </ActionIcon>
      )}
      {assistant?.configurableArguments && showModal && (
        <ConfigurationUserValuesModal configuration={assistant} onSubmit={close} onClose={close} />
      )}
    </div>
  );
};
