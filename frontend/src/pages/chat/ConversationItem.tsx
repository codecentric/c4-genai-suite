import { Button, Menu, rem } from '@mantine/core';
import { IconCopy, IconDots, IconEdit, IconTrash } from '@tabler/icons-react';
import { FormEvent, memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConversationDto } from 'src/api';
import { texts } from 'src/texts';
import { isMobile } from '../utils';
import { useStateOfSelectedChatId } from './state/chat';
import { useStateMutateDuplicateChat, useStateMutateRemoveChat, useStateMutateRenameChat } from './state/listOfChats';

const getInputValue = (e: FormEvent<HTMLFormElement>) => (new FormData(e.currentTarget).get('name') as string)?.trim();

interface ChatProps {
  chat: ConversationDto;
}

export const ConversationItem = memo(({ chat }: ChatProps) => {
  const isSelected = chat.id === useStateOfSelectedChatId();
  const removeChat = useStateMutateRemoveChat();
  const duplicateChat = useStateMutateDuplicateChat();
  const renameChat = useStateMutateRenameChat();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showRenameInput, setShowRenameInput] = useState(false);

  const submitRename = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = getInputValue(event);
    if (name && name !== chat.name) {
      renameChat.mutate({ chat, name });
    }
    setShowRenameInput(false);
  };

  if (showRenameInput) {
    return (
      <form className="p-0" onSubmit={submitRename}>
        <div>
          <input
            autoFocus
            name="name"
            className="input input-sm input-bordered h-9 w-full"
            onBlur={() => setShowRenameInput(false)}
            onKeyUp={(e) => e.key === 'Escape' && setShowRenameInput(false)}
            defaultValue={chat.name}
          />
        </div>
      </form>
    );
  }

  return (
    <Button
      size="sm"
      p="xs"
      onClick={async () => await navigate(`/chat/${chat.id}`)}
      fullWidth
      justify="space-between"
      variant={isSelected ? 'filled' : 'subtle'}
      classNames={{ root: 'relative group transition-all' }}
      role="navigation"
      onDoubleClick={() => isSelected && setShowRenameInput(true)}
    >
      {chat.name}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute top-0 right-0 flex h-full items-center px-2 ${isMobile() ? '' : 'opacity-0 group-hover:opacity-100'}`}
      >
        <Menu width={200} opened={menuOpen} onChange={setMenuOpen}>
          <Menu.Target>
            <IconDots style={{ width: rem(18), height: rem(18) }} />
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconEdit className="h-4 w-4" />}
              disabled={renameChat.isPending}
              onClick={() => setShowRenameInput(true)}
            >
              {texts.common.rename}
            </Menu.Item>
            <Menu.Item
              leftSection={<IconCopy className="h-4 w-4" />}
              disabled={duplicateChat.isPending}
              onClick={() => duplicateChat.mutate(chat.id)}
            >
              {texts.common.duplicate}
            </Menu.Item>
            <Menu.Item
              color="red"
              leftSection={<IconTrash className="h-4 w-4" />}
              disabled={removeChat.isPending}
              onClick={() => removeChat.mutate(chat.id)}
            >
              {texts.common.remove}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>
    </Button>
  );
});
