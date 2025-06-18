import '@mantine/core/styles.css';
import '@mantine/dropzone/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
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
import { AdminPage } from './pages/admin/AdminPage';
import { ChatOrWelcomePage } from './pages/chat/ChatOrWelcomePage';
import { LoginPage } from './pages/login/LoginPage';
import { i18next } from './texts/i18n';

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
                    path="/*"
                    element={
                      <Routes>
                        <Route
                          path="/chat/*"
                          element={
                            <RouteWhenPrivate>
                              <ChatOrWelcomePage />
                            </RouteWhenPrivate>
                          }
                        />
                        <Route
                          path="/admin/*"
                          element={
                            <RouteWhenPrivate>
                              <RouteWhenAdmin>
                                <AdminPage />
                              </RouteWhenAdmin>
                            </RouteWhenPrivate>
                          }
                        />
                        <Route path="*" element={<TransientNavigate to="/chat" />} />
                      </Routes>
                    }
                  />

                  <Route
                    path="/login"
                    element={
                      <RouteWhenLoggedOut>
                        <LoginPage />
                      </RouteWhenLoggedOut>
                    }
                  />
                  <Route path="*" element={<TransientNavigate to="/" />} />
                </Routes>
              </InAppDocsProvider>
            </ThemeProviders>
          </TransientProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
