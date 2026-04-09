import { ActionIcon, Group, Select, SelectProps, Text } from '@mantine/core';
import { IconCheck, IconChevronDown, IconSettings } from '@tabler/icons-react';
import { useState } from 'react';
import { usePersistentState } from 'src/hooks';
import { ConfigurationUserValuesModal } from 'src/pages/chat/conversation/ConfigurationUserValuesModal';
import { useStateOfEnabledAssistants, useStateOfSelectedAssistant } from 'src/pages/chat/state/listOfAssistants';
import { isMobile } from 'src/pages/utils';
import { texts } from 'src/texts';
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

  const renderSelectOption: SelectProps['renderOption'] = ({ option, checked }) => (
    <Group flex="1" gap="xs">
      <div>
        <Text size="sm">{option.label}</Text>
        <Text size="xs" c="gray.7">
          {assistants.find((c) => c.id + '' === option.value)?.description}
        </Text>
      </div>
      {checked && <IconCheck size={20} style={{ marginInlineStart: 'auto' }} />}
    </Group>
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
        aria-label={texts.chat.selectAssistant}
        className={isMobile() ? 'w-full' : 'max-w-56'}
        radius={'md'}
        comboboxProps={{
          radius: 'md',
          shadow: 'md',
          position: 'bottom-start',
          width: isMobile() ? '100%' : '280px',
        }}
        classNames={{
          input: 'outline-none focus-visible:ring-1 focus-visible:ring-black',
        }}
        maxDropdownHeight={480}
        renderOption={renderSelectOption}
        onChange={handleOnChange}
        value={assistant?.id + ''}
        data={assistants.map((c) => ({ value: c.id + '', label: c.name }))}
        disabled={!canEditConfiguration}
        size="md"
        data-testid="chat-assistant-select"
        scrollAreaProps={{ type: 'always' }}
        rightSection={<IconChevronDown size={16} />}
        searchable
        withCheckIcon
        checkIconPosition="right"
        placeholder={texts.chat.searchAssistantsPlaceholder}
      />
      {assistant?.configurableArguments && (
        <ActionIcon
          data-testid="assistant-user-configuration"
          onClick={() => setShowModal(true)}
          size="xl"
          variant="subtle"
          aria-label={texts.chat.configureAssistant}
          data-tooltip-id="default"
          data-tooltip-content={texts.chat.configureAssistant}
        >
          <IconSettings data-testid="configuration-settings-icon" />
        </ActionIcon>
      )}
      {assistant?.configurableArguments && showModal && (
        <ConfigurationUserValuesModal configuration={assistant} onSubmit={close} onClose={close} />
      )}
    </div>
  );
};
