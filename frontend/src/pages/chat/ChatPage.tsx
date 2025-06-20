import { Button } from '@mantine/core';
import { IconEdit } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Route, Routes } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useApi } from 'src/api';
import { CollapseButton, ProfileButton } from 'src/components';
import { NavigationBar } from 'src/components/NavigationBar';
import { useSidebarState, useTheme, useTransientNavigate } from 'src/hooks';
import { buildError } from 'src/lib';
import { texts } from 'src/texts';
import { isMobile } from '../utils';
import { Conversations } from './Conversations';
import { NewPage } from './NewPage';
import { DocumentSource, SourcesChunkPreview } from './SourcesChunkPreview';
import { ConversationPage } from './conversation/ConversationPage';
import { Files } from './files/Files';
import { useAIConversation } from './state';
import { useUserBucket } from './useUserBucket';

const CustomResizeHandle = () => (
  <PanelResizeHandle className="group ml-[-2px] flex w-2 items-center bg-gray-100 p-[2px] transition-all hover:bg-gray-200">
    <div className="h-6 w-full rounded group-hover:bg-white" />
  </PanelResizeHandle>
);
const getPanelSizes = (isRightPanelOpen: boolean) => {
  const leftBarRatio = 15;
  const rightBarRatio = 20;
  const mobileSideBarRatio = 90;
  const mobileContentRatio = 100 - mobileSideBarRatio;
  const contentRatio = isRightPanelOpen ? 100 - leftBarRatio - rightBarRatio : 100 - rightBarRatio;
  const isMobileView = isMobile();
  return {
    left: {
      defaultSize: isMobileView ? mobileSideBarRatio : leftBarRatio,
      minSize: isMobileView ? mobileSideBarRatio : leftBarRatio,
      maxSize: isMobileView ? mobileSideBarRatio : leftBarRatio + 1000,
    },
    content: {
      defaultSize: isMobileView ? mobileContentRatio : contentRatio,
      minSize: isMobileView ? mobileContentRatio : 50,
    },
    right: {
      defaultSize: isMobileView ? mobileSideBarRatio : rightBarRatio,
      minSize: isMobileView ? mobileSideBarRatio : rightBarRatio,
      maxSize: isMobileView ? mobileSideBarRatio : 50,
    },
  };
};
export function ChatPage() {
  const api = useApi();
  const { theme } = useTheme();
  const isMobileView = isMobile();
  const [selectedDocument, setSelectedDocument] = useState<DocumentSource | undefined>();

  const navigate = useTransientNavigate();

  const { setConversations } = useAIConversation();
  const { userBucket, selectedConfigurationId, setSelectedConfigurationId } = useUserBucket();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);

  const [sidebarLeft, setSidebarLeft] = useSidebarState('sidebar-left');
  const [sidebarRight, setSidebarRight] = useSidebarState('sidebar-right');
  const panelSizes = getPanelSizes(sidebarRight || !!selectedDocument);

  // Consider to stop handing this down into the ProfileButton and use a hook inside the ProfileButton for this instead
  const deleting = useMutation({
    mutationFn: () => api.conversations.deleteConversations(),
    onSuccess: () => {
      setSelectedConversationId(null);
      setConversations([]);
      navigate(`/chat`);
    },
    onError: async (error) => {
      toast.error(await buildError(texts.chat.clearConversationsFailed, error));
    },
  });

  // This navigate is triggered if needed due to a deleted conversation from within the Conversations component.
  // As this is only used inside a hook inside Conversations, consider moving it there.
  const onConversationDeleted = (conversationId: number) => {
    if (conversationId === selectedConversationId) {
      navigate('/chat');
    }
  };
  // close the sources tab everytime the user selects another conversation
  useEffect(() => setSelectedDocument(undefined), [selectedConversationId]);
  const rightPanelVisible = sidebarRight && selectedConversationId && (userBucket || selectedDocument);
  return (
    <div className="flex h-screen flex-col">
      <NavigationBar theme={theme} />
      <PanelGroup direction="horizontal">
        {sidebarLeft && (
          <>
            <Panel
              className="chat-conversations flex w-64 shrink-0 flex-col overflow-hidden bg-gray-100"
              id="left"
              order={0}
              style={{ overflow: 'auto' }}
              onClick={() => {
                if (isMobileView) setSidebarLeft(false);
              }}
              {...panelSizes.left}
            >
              <div className="p-2">
                <Button
                  className="justify-start"
                  variant="subtle"
                  p="xs"
                  onClick={() => navigate('/chat/new')}
                  fullWidth
                  justify="space-between"
                  rightSection={<IconEdit className="w-4" />}
                >
                  {texts.chat.newChat}
                </Button>
              </div>

              <div className="grow overflow-y-auto p-2">
                <Conversations selectedConversationId={selectedConversationId} onConversationDeleted={onConversationDeleted} />
              </div>
              <div className="p-2" onClick={(e) => e.stopPropagation()}>
                <ProfileButton section="chat" onClearConversations={deleting.mutate} />
              </div>
            </Panel>
            {!isMobileView && <CustomResizeHandle />}
          </>
        )}

        <Panel id="center" order={1} {...panelSizes.content}>
          <div className="chat-main relative min-h-0 grow overflow-hidden">
            {isMobileView && (rightPanelVisible || sidebarLeft) ? (
              <div
                className="h-screen w-screen bg-gray-300"
                onClick={() => (sidebarLeft ? setSidebarLeft(!sidebarLeft) : setSidebarRight(!sidebarRight))}
              ></div>
            ) : (
              <Routes>
                <Route path="/new" element={<NewPage name={texts.chat.newChat} />} />
                <Route path="" element={<NewPage />} />
                <Route
                  path=":id"
                  element={
                    <ConversationPage
                      onConversationSelected={setSelectedConversationId}
                      selectedConfigurationId={selectedConfigurationId}
                      onConfigurationSelected={setSelectedConfigurationId}
                      selectDocument={(conversationId, messageId, documentUri) => {
                        setSelectedDocument({ conversationId, messageId, documentUri });
                        setSidebarRight(true);
                      }}
                    />
                  }
                />
              </Routes>
            )}
            {(!isMobileView || !rightPanelVisible) && (
              <CollapseButton
                className="left absolute top-[40%]"
                side="left"
                isToggled={!sidebarLeft}
                onClick={() => setSidebarLeft(!sidebarLeft)}
                tooltip={
                  sidebarLeft ? texts.common.hide(texts.common.conversations) : texts.common.show(texts.common.conversations)
                }
              />
            )}
            {(!isMobileView || !sidebarLeft) && userBucket && (
              <CollapseButton
                className="absolute top-[40%] right-2"
                side="right"
                isToggled={!sidebarRight}
                onClick={() => setSidebarRight(!sidebarRight)}
                tooltip={
                  sidebarRight
                    ? texts.common.hide(selectedDocument ? texts.chat.sources.content : texts.common.files)
                    : texts.common.show(selectedDocument ? texts.chat.sources.content : texts.common.files)
                }
              />
            )}
          </div>
        </Panel>
        {rightPanelVisible && (
          <>
            {!isMobileView && <CustomResizeHandle />}
            <Panel style={{ overflow: 'auto' }} id="right" order={2} {...panelSizes.right} className="bg-gray-100">
              {selectedDocument ? (
                <SourcesChunkPreview onClose={() => setSelectedDocument(undefined)} document={selectedDocument} />
              ) : (
                userBucket && (
                  <Files
                    configurationId={selectedConfigurationId}
                    userBucket={userBucket}
                    conversationId={selectedConversationId}
                  />
                )
              )}
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  );
}
