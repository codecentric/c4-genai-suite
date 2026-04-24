import { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useEvalAvailability } from 'src/api/state/useEvalAvailability';
import { CollapseButton, ProfileButton, TransientNavigate, TransientNavLink } from 'src/components';
import { NavigationBar } from 'src/components/NavigationBar';
import { useTheme } from 'src/hooks';
import { texts } from 'src/texts';
import { useStateOfSelectedChatId } from '../chat/state/chat';
import { AuditLogPage } from './audit-log/AuditLogPage';
import { DashboardPage } from './dashboard/DashboardPage';
import { EvaluationDetailPage } from './evals/evaluations/EvaluationDetailPage';
import { EvaluationsPage } from './evals/evaluations/EvaluationsPage';
import { LlmEndpointsPage } from './evals/llm-endpoints/LlmEndpointsPage';
import { MetricDetailPage } from './evals/metrics/MetricDetailPage';
import { MetricsPage } from './evals/metrics/MetricsPage';
import { QaCatalogDetailPage } from './evals/qa-catalogs/QaCatalogDetailPage';
import { QaCatalogsPage } from './evals/qa-catalogs/QaCatalogsPage';
import { ConfigurationPage } from './extensions/ConfigurationPage.tsx';
import { BucketsPage } from './files/BucketsPage';
import { ThemePage } from './theme/ThemePage';
import { UserGroupsPage } from './user-groups/UserGroupsPage';
import { UsersPage } from './users/UsersPage';

export function AdminPage() {
  const [isNavigationBarOpen, setIsNavigationBarOpen] = useState(true);
  const [isEvalsOpen, setIsEvalsOpen] = useState(false);
  const { theme } = useTheme();
  const chatId = useStateOfSelectedChatId();
  const { isEvalAvailable } = useEvalAvailability();

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
                <li>
                  <TransientNavLink className="block" to="/admin/audit-log">
                    {texts.auditLog.headline}
                  </TransientNavLink>
                </li>
                {isEvalAvailable && (
                  <li>
                    <button className="block w-full text-left" onClick={() => setIsEvalsOpen(!isEvalsOpen)}>
                      <span className="flex items-center justify-between">
                        {texts.evals.headline}
                        <svg
                          className={`h-4 w-4 transition-transform ${isEvalsOpen ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </button>
                    {isEvalsOpen && (
                      <ul className="mt-1 ml-4 space-y-1">
                        <li>
                          <TransientNavLink className="block" to="/admin/evals/evaluations">
                            {texts.evals.evaluationsLabel}
                          </TransientNavLink>
                        </li>
                        <li>
                          <TransientNavLink className="block" to="/admin/evals/qa-catalogs">
                            {texts.evals.qaCatalogs}
                          </TransientNavLink>
                        </li>
                        <li>
                          <TransientNavLink className="block" to="/admin/evals/metrics">
                            {texts.evals.metrics}
                          </TransientNavLink>
                        </li>
                        <li>
                          <TransientNavLink className="block" to="/admin/evals/llm-endpoints">
                            {texts.evals.llmEndpoints}
                          </TransientNavLink>
                        </li>
                      </ul>
                    )}
                  </li>
                )}
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

            <Route path="/audit-log" element={<AuditLogPage />} />

            <Route path="/assistants/*" element={<ConfigurationPage />} />

            {isEvalAvailable && (
              <>
                <Route path="/evals/evaluations" element={<EvaluationsPage />} />
                <Route path="/evals/evaluations/:id" element={<EvaluationDetailPage />} />
                <Route path="/evals/qa-catalogs" element={<QaCatalogsPage />} />
                <Route path="/evals/qa-catalogs/:catalogId" element={<QaCatalogDetailPage />} />
                <Route path="/evals/metrics" element={<MetricsPage />} />
                <Route path="/evals/metrics/:metricId" element={<MetricDetailPage />} />
                <Route path="/evals/llm-endpoints" element={<LlmEndpointsPage />} />
              </>
            )}

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
