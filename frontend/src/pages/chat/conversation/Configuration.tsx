import { ActionIcon, Select, SelectProps, Text } from '@mantine/core';
import { IconSettings } from '@tabler/icons-react';
import { useState } from 'react';
import { ConfigurationUserValuesModal } from 'src/pages/chat/conversation/ConfigurationUserValuesModal';
import {
  useStateOfAssistants,
  useStateOfSelectedAssistant,
  useUpdateLastSelectedAssistant,
} from 'src/pages/chat/state/listOfAssistants';
import { isMobile } from 'src/pages/utils';
import { useStateMutateChat, useStateOfChat } from '../state/chat';

interface ConfigurationProps {
  canEditConfiguration?: boolean;
}

export const Configuration = ({ canEditConfiguration }: ConfigurationProps) => {
  const chat = useStateOfChat();
  const updateChat = useStateMutateChat(chat.id);
  const assistants = useStateOfAssistants();
  const assistant = useStateOfSelectedAssistant();
  const updateLastSelectedAssistant = useUpdateLastSelectedAssistant();

  const [showModal, setShowModal] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const renderSelectOption: SelectProps['renderOption'] = ({ option }) => (
    <div>
      <Text>{option.label}</Text>
      <Text size="xs" c="dimmed">
        {assistants.find((c) => c.id + '' === option.value)?.description}
      </Text>
    </div>
  );

  const close = () => setShowModal(false);

  const handleAssistantChange = (value: string | null) => {
    if (value) {
      const assistantId = +value;
      updateChat.mutate({ configurationId: assistantId });
      updateLastSelectedAssistant(assistantId);
    }
  };

  return (
    <div className="flex flex-row gap-x-4">
      <Select
        className={isMobile() ? 'w-full' : 'max-w-80'}
        radius={'md'}
        comboboxProps={{
          radius: 'md',
          shadow: 'md',
          position: 'bottom-start',
          middlewares: { flip: false, shift: false },
        }}
        renderOption={renderSelectOption}
        onChange={handleAssistantChange}
        value={assistant?.id + ''}
        data={assistants.map((c) => ({ value: c.id + '', label: c.name }))}
        disabled={!canEditConfiguration}
        size="md"
        data-testid="chat-assistent-select"
        scrollAreaProps={{
          type: 'always',
          scrollbarSize: 8,
          offsetScrollbars: true,
        }}
        searchable
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        placeholder="Search assistants..."
        maxDropdownHeight={400}
        styles={{
          dropdown: {
            maxHeight: '400px',
            minWidth: '320px',
          },
          option: {
            padding: '12px 16px',
          },
        }}
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
