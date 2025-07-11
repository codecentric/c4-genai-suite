import { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { CollapseButton, ProfileButton, TransientNavigate, TransientNavLink } from 'src/components';
import { NavigationBar } from 'src/components/NavigationBar';
import { useTheme } from 'src/hooks';
import { texts } from 'src/texts';
import { useStateOfSelectedChatId } from '../chat/state/chat';
import { DashboardPage } from './dashboard/DashboardPage';
import { ConfigurationPage } from './extensions/ConfigurationPage.tsx';
import { BucketsPage } from './files/BucketsPage';
import { ThemePage } from './theme/ThemePage';
import { UserGroupsPage } from './user-groups/UserGroupsPage';
import { UsersPage } from './users/UsersPage';

export function AdminPage() {
  const [isNavigationBarOpen, setIsNavigationBarOpen] = useState(true);
  const { theme } = useTheme();
  const chatId = useStateOfSelectedChatId();

  return (
    <div className="flex h-screen flex-col">
      <NavigationBar theme={theme} redirectTo={`/chat/${chatId || ''}`} />
      <div className="sidebar-admin flex min-h-0 grow" data-testid="sidebar-admin">
        {isNavigationBarOpen && (
          <div className="shadow-xxl flex w-48 shrink-0 flex-col justify-between bg-white">
            <div>
              <ul className="nav-menu nav-menu-bordered mt-4 gap-1">
                <li>
                  <TransientNavLink className="block" to="/admin/dashboard">
                    {texts.common.dashboard}
                  </TransientNavLink>
                </li>
                <li>
                  <TransientNavLink className="block" to="/admin/theme">
                    {texts.theme.headline}
                  </TransientNavLink>
                </li>
                <li>
                  <TransientNavLink className="block" to="/admin/files">
                    {texts.files.headline}
                  </TransientNavLink>
                </li>
                <li>
                  <TransientNavLink className="block" to="/admin/assistants">
                    {texts.extensions.configurations}
                  </TransientNavLink>
                </li>
                <li>
                  <TransientNavLink className="block" to="/admin/users">
                    {texts.users.headline}
                  </TransientNavLink>
                </li>
                <li>
                  <TransientNavLink className="block" to="/admin/user-groups">
                    {texts.userGroups.headline}
                  </TransientNavLink>
                </li>
              </ul>
            </div>

            <div className="p-2">
              <ProfileButton section="admin" />
            </div>
          </div>
        )}
        <div className="flex min-w-0 grow flex-col items-stretch bg-gray-50">
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route path="/theme" element={<ThemePage />} />

            <Route path="/files/*" element={<BucketsPage />} />

            <Route path="/users" element={<UsersPage />} />

            <Route path="/user-groups" element={<UserGroupsPage />} />

            <Route path="/assistants/*" element={<ConfigurationPage />} />

            <Route path="*" element={<TransientNavigate to="/admin/dashboard" />} />
          </Routes>
          <CollapseButton
            className="left absolute top-1/2"
            side="left"
            isToggled={!isNavigationBarOpen}
            onClick={() => setIsNavigationBarOpen(!isNavigationBarOpen)}
            tooltip={isNavigationBarOpen ? texts.common.hide(texts.common.menu) : texts.common.show(texts.common.menu)}
          />
        </div>
      </div>
    </div>
  );
}
