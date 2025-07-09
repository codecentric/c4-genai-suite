import '@mantine/core/styles.css';
import '@mantine/dropzone/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, ReactNode, Suspense } from 'react';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { Tooltip } from 'react-tooltip';
import {
  RouteWhenAdmin,
  RouteWhenPrivate,
  ThemeProvider,
  ThemeStyle,
  ThemeTitle,
  TransientNavigate,
  TransientProvider,
} from './components';
import { DialogProvider } from './components/DialogProvider';
import { InAppDocsProvider } from './components/InAppDocsProvider';
import { MantineThemeProvider } from './components/MantineThemeProvider';
import { RouteWhenLoggedOut } from './components/RouteWhenLoggedOut';
import { i18next } from './texts/i18n';

// Lazy load heavy components
const AdminPage = lazy(() => import('./pages/admin/AdminPage').then((m) => ({ default: m.AdminPage })));
const ChatPage = lazy(() => import('./pages/chat/ChatPage').then((m) => ({ default: m.ChatPage })));
const LoginPage = lazy(() => import('./pages/login/LoginPage').then((m) => ({ default: m.LoginPage })));

const queryClient = new QueryClient();

const ThemeProviders = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const isAdmin = location.pathname.split('/').at(1) === 'admin';
  return (
    <ThemeProvider>
      <MantineThemeProvider admin={isAdmin}>
        <DialogProvider>
          <ThemeStyle />
          <ThemeTitle />
          {children}
          <Tooltip id="default" />
          <ToastContainer />
        </DialogProvider>
      </MantineThemeProvider>
    </ThemeProvider>
  );
};

export function App() {
  return (
    <I18nextProvider i18n={i18next}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TransientProvider>
            <ThemeProviders>
              <InAppDocsProvider>
                <Routes>
                  <Route
                    path="/login"
                    element={
                      <RouteWhenLoggedOut>
                        <Suspense fallback={<div>Loading...</div>}>
                          <LoginPage />
                        </Suspense>
                      </RouteWhenLoggedOut>
                    }
                  />
                  <Route
                    path="/chat/*"
                    element={
                      <RouteWhenPrivate>
                        <Suspense fallback={<div>Loading...</div>}>
                          <ChatPage />
                        </Suspense>
                      </RouteWhenPrivate>
                    }
                  />
                  <Route
                    path="/admin/*"
                    element={
                      <RouteWhenPrivate>
                        <RouteWhenAdmin>
                          <Suspense fallback={<div>Loading...</div>}>
                            <AdminPage />
                          </Suspense>
                        </RouteWhenAdmin>
                      </RouteWhenPrivate>
                    }
                  />
                  <Route path="/" element={<TransientNavigate to="/chat" />} />
                  <Route path="*" element={<TransientNavigate to="/chat" />} />
                </Routes>
              </InAppDocsProvider>
            </ThemeProviders>
          </TransientProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
