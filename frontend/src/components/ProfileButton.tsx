import { Menu } from '@mantine/core';
import { IconLogout, IconMessage, IconSettings, IconTrash, IconUserCog } from '@tabler/icons-react';
import { NavLink } from 'react-router-dom';
import { ConfirmDialog } from 'src/components/ConfirmDialog';
import { UserProfileModal } from 'src/components/UserProfileModal';
import { useLogoutUrl, useProfile } from 'src/hooks';
import { useStateOfSelectedChatId } from 'src/pages/chat/state/chat';
import { isMobile } from 'src/pages/utils';
import { texts } from 'src/texts';
import { Avatar } from './Avatar';
import { useState } from 'react';
import { useAuthSettings } from 'src/hooks/useAuthSettings';

interface ProfileButtonProps {
  onClearConversations?: () => void;
  section: 'admin' | 'chat';
}

export const ProfileButton = ({ onClearConversations, section }: ProfileButtonProps) => {
  const profile = useProfile();
  const logoutUrl = useLogoutUrl();
  const chatId = useStateOfSelectedChatId();
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  const { data: authSettings } = useAuthSettings();

  return (
    <Menu width={250}>
      <Menu.Target data-testid="menu user">
        <button className="btn btn-ghost h-auto w-full justify-start p-2 hover:bg-gray-200">
          <div className="flex max-w-full items-center gap-2">
            <div className="shrink-0">
              <Avatar user={profile} />
            </div>

            <div className="min-w-0 text-left text-sm leading-5">
              <div className="truncate font-semibold">{profile.name}</div>
              <div className="lead truncate font-normal">{profile.email}</div>
            </div>
          </div>
        </button>
      </Menu.Target>

      <Menu.Dropdown>
        {section === 'admin' && (
          <Menu.Item leftSection={<IconMessage size={14} />} component={NavLink} to={`/chat/${chatId || ''}`}>
            {texts.common.chat}
          </Menu.Item>
        )}

        {section === 'chat' && authSettings?.enablePasswordAuth && (
          <Menu.Item leftSection={<IconSettings size={14} />} onClick={() => setIsUserModalOpen(true)}>
            Settings
          </Menu.Item>
        )}

        {section === 'chat' && profile.isAdmin && !isMobile() && (
          <Menu.Item leftSection={<IconUserCog size={14} />} component={NavLink} to="/admin">
            {texts.common.administration}
          </Menu.Item>
        )}

        {section === 'chat' && onClearConversations && (
          <ConfirmDialog
            title={texts.chat.clearConversationsConfirmTitle}
            text={texts.chat.clearConversationsConfirmText}
            performText={texts.chat.clearConversationsPerformText}
            onPerform={() => onClearConversations()}
          >
            {({ onClick }) => (
              <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={onClick}>
                {texts.common.clearConversations}
              </Menu.Item>
            )}
          </ConfirmDialog>
        )}

        <Menu.Item leftSection={<IconLogout size={14} />} component={'a'} href={logoutUrl}>
          Logout
        </Menu.Item>
      </Menu.Dropdown>

      <UserProfileModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} />
    </Menu>
  );
};
