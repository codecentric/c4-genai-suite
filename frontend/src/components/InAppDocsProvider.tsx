/* eslint-disable react-refresh/only-export-components */
import { ActionIcon, Tooltip } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import React, { createContext, useContext, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useProfile } from 'src/hooks';
import { texts } from 'src/texts';
import { Markdown } from '../components/Markdown';

type DocsContextType = {
  isDocsButtonVisible: boolean;
  toggleDocs: () => void;
};

const DocsContext = createContext<DocsContextType | undefined>(undefined);

export const useDocsContext = () => {
  const context = useContext(DocsContext);
  if (context === undefined) throw new Error('useDocsContext must be used within InAppDocsProvider');
  return context;
};

type InAppDocsLayoutProps = {
  docsMarkdown: string;
  isDocsVisible: boolean;
  toggleDocs: () => void;
  children: React.ReactNode;
};

const InAppDocsLayout: React.FC<InAppDocsLayoutProps> = ({ docsMarkdown, isDocsVisible, toggleDocs, children }) => {
  return (
    <div className="flex h-screen flex-col">
      <div className="flex flex-1 overflow-hidden">
        <div className={`flex-grow ${isDocsVisible ? 'w-0 xl:w-2/3' : 'w-full'} overflow-auto`}>{children}</div>
        {isDocsVisible && (
          <div className="bg-base-100 text-base-content flex h-full w-full flex-col border-l xl:w-1/3">
            <div className="bg-primary text-primary-content flex h-12 items-center justify-between p-4">
              <h2 className="text-lg font-semibold">{texts.common.docsHeader}</h2>
              <ActionIcon onClick={toggleDocs} size="xl" mr="xs" variant="subtle" color="primary-content">
                <Tooltip label={texts.common.hide(texts.common.docs)}>
                  <IconX data-testid="close-icon" />
                </Tooltip>
              </ActionIcon>
            </div>
            <div className="h-0 flex-1 overflow-auto p-4">
              <Markdown>{docsMarkdown}</Markdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * @description This is a combined context provider for the useDocsContext hook and a layout component which displays the docs penal on the right.
 */
export const InAppDocsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const fetchMarkdown = async (urlPath: string): Promise<string> => {
    const urlPathWithoutIds = urlPath.replace(/\/[0-9]+$/, '');
    const response = await fetch(`/docs${urlPathWithoutIds}/index.md`);
    const contentType = response.headers.get('content-type') || '';
    const markdownDocsFileExists = !contentType.includes('html');
    if (!markdownDocsFileExists) throw new Error('Failed to fetch documentation.');
    return response.text();
  };

  const location = useLocation();
  const query = useQuery<string, unknown>({
    queryKey: ['docs', location.pathname],
    queryFn: () => fetchMarkdown(location.pathname),
  });
  const [isDocsOpen, setIsDocsOpen] = useState(false);

  const toggleDocs = () => setIsDocsOpen((prev) => !prev);
  const profile = useProfile();
  console.log(profile);
  const isDocsAvailable = query.isSuccess && profile?.isAdmin;
  const isDocsButtonVisible = isDocsAvailable && !isDocsOpen;

  return (
    <DocsContext.Provider value={{ isDocsButtonVisible, toggleDocs }}>
      <InAppDocsLayout docsMarkdown={query.data || ''} isDocsVisible={isDocsOpen && isDocsAvailable} toggleDocs={toggleDocs}>
        {children}
      </InAppDocsLayout>
    </DocsContext.Provider>
  );
};
