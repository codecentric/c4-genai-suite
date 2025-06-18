import { Button, Menu, rem } from '@mantine/core';
import { IconCopy, IconDots, IconEdit, IconTrash } from '@tabler/icons-react';
import { ChangeEvent, FormEvent, KeyboardEvent, memo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConversationDto } from 'src/api';
import { texts } from 'src/texts';
import {
  useStateMutateDuplicateConversation,
  useStateMutateRemoveConversation,
  useStateMutateRenameConversation,
  useStateOfSelectedConversationId,
} from './state';
import { isMobile } from '../utils';

interface ConversationProps {
  conversation: ConversationDto;
}

export const ConversationItem = memo(({ conversation }: ConversationProps) => {
  const selectedConversationId = useStateOfSelectedConversationId();
  const removeConversation = useStateMutateRemoveConversation();
  const duplicateConversation = useStateMutateDuplicateConversation();
  const renameConversation = useStateMutateRenameConversation();
  const [name, setName] = useState(conversation.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showRenameInput, setShowRenameInput] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    setName(conversation.name);
  }, [conversation.name]);

  const doCancel = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      doStopRename();
    }
  };

  const doCommit = (event: FormEvent) => {
    if (name) {
      renameConversation.mutate({ conversation, name });
      setShowRenameInput(false);
    } else {
      doStopRename();
    }

    event.preventDefault();
  };

  const doStopRename = () => {
    setShowRenameInput(false);
    setName(conversation.name);
  };

  const doStartRename = () => {
    setShowRenameInput(true);
    setName(conversation.name);
  };

  const doSetText = (event: ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  if (showRenameInput) {
    return (
      <form className="p-0" onSubmit={doCommit}>
        <div>
          <input
            autoFocus
            className="input input-sm input-bordered h-9 w-full"
            onBlur={doStopRename}
            onChange={doSetText}
            onKeyUp={doCancel}
            value={name || ''}
          />
        </div>
      </form>
    );
  }

  const selected = selectedConversationId === conversation.id;
  return (
    <Button
      size="sm"
      p="xs"
      onClick={() => navigate(`/chat/${conversation.id}`)}
      fullWidth
      justify="space-between"
      variant={selected ? 'filled' : 'subtle'}
      classNames={{ root: 'relative group transition-all' }}
      role="navigation"
    >
      {conversation.name}
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
              disabled={renameConversation.isPending}
              onClick={doStartRename}
            >
              {texts.common.rename}
            </Menu.Item>
            <Menu.Item
              leftSection={<IconCopy className="h-4 w-4" />}
              disabled={duplicateConversation.isPending}
              onClick={() => duplicateConversation.mutate(conversation.id)}
            >
              {texts.common.duplicate}
            </Menu.Item>
            <Menu.Item
              color="red"
              leftSection={<IconTrash className="h-4 w-4" />}
              disabled={removeConversation.isPending}
              onClick={() => removeConversation.mutate(conversation.id)}
            >
              {texts.common.remove}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>
    </Button>
  );
});
