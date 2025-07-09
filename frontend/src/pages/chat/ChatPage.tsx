import { Button, Tabs } from '@mantine/core';
import { IconBulb, IconEdit, IconMessageCircle } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { Prompt } from 'src/api/prompts';
import { CollapseButton, ProfileButton } from 'src/components';
import { NavigationBar } from 'src/components/NavigationBar';
import { useSidebarState, useTheme } from 'src/hooks';
import { texts } from 'src/texts';
import { isMobile } from '../utils';
import { ConversationItems } from './ConversationItems';
import { NewChatRedirect } from './NewChatRedirect';
import { DocumentSource, SourcesChunkPreview } from './SourcesChunkPreview';
import { ConversationPage } from './conversation/ConversationPage';
import { Files } from './files/Files';
import { CreatePromptModal } from './prompts/CreatePromptModal';
import { PromptLibrary, PromptSidebar } from './prompts/PromptLibrary';
import { useStateOfSelectedChatId } from './state/chat';
import { useListOfChatsInit, useMutateNewChat, useStateMutateRemoveAllChats, useStateOfChatEmptiness } from './state/listOfChats';
import { useUserBucket } from './useUserBucket';

const CustomResizeHandle = () => (
  <PanelResizeHandle className="group ml-[-2px] flex w-2 items-center bg-gray-100 p-[2px] transition-all hover:bg-gray-200">
    <div className="h-6 w-full rounded group-hover:bg-white" />
  </PanelResizeHandle>
);

const getPanelSizes = (isRightPanelOpen: boolean) => {
  const leftBarRatio = 15;
  const rightBarRatio = 20;
  const contentRatio = 100 - leftBarRatio - (isRightPanelOpen ? rightBarRatio : 0);
  const isMobileView = isMobile();
  const mobileSideBarRatio = 90;
  const mobileContentRatio = 100 - mobileSideBarRatio;
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
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isMobileView = isMobile();
  useListOfChatsInit();

  const [selectedDocument, setSelectedDocument] = useState<DocumentSource | undefined>();
  const { userBucket, selectedConfigurationId, setSelectedConfigurationId } = useUserBucket();
  const checkIfEmptyChat = useStateOfChatEmptiness();
  const selectedChatId = useStateOfSelectedChatId();
  const removeAllChats = useStateMutateRemoveAllChats();
  const createNewChat = useMutateNewChat();

  const [sidebarLeft, setSidebarLeft] = useSidebarState('sidebar-left');
  const [sidebarRight, setSidebarRight] = useSidebarState('sidebar-right');
  const [leftSidebarTab, setLeftSidebarTab] = useState<string | null>('conversations');
  const [createPromptModalOpen, setCreatePromptModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>('all');
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('newest');

  const rightPanelVisible = !!(
    sidebarRight &&
    selectedChatId &&
    (userBucket || selectedDocument) &&
    leftSidebarTab === 'conversations'
  );
  const panelSizes = getPanelSizes(rightPanelVisible);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const openNewChatIfNeeded = () => {
    if (selectedChatId) {
      void checkIfEmptyChat(selectedChatId)
        .then((isEmpty) => {
          if (isEmpty) textareaRef.current?.focus();
          else {
            void createNewChat.mutate();
          }
        })
        .catch(() => {
          // Ignore errors in chat emptiness check
        });
    }
  };

  // close the sources tab everytime the user selects another conversation
  useEffect(() => setSelectedDocument(undefined), [selectedChatId]);

  return (
    <div className="flex h-screen flex-col">
      <NavigationBar theme={theme}>
        <Tabs value={leftSidebarTab} onChange={setLeftSidebarTab} className="ml-8 flex">
          <Tabs.List>
            <Tabs.Tab value="conversations" leftSection={<IconMessageCircle size={16} />}>
              Chats
            </Tabs.Tab>
            <Tabs.Tab value="prompts" leftSection={<IconBulb size={16} />}>
              Prompts
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>
      </NavigationBar>
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
              {leftSidebarTab === 'conversations' ? (
                <div className="flex h-full flex-col">
                  <div className="p-2">
                    <Button
                      className="justify-start"
                      variant="subtle"
                      p="xs"
                      onClick={openNewChatIfNeeded}
                      fullWidth
                      justify="space-between"
                      rightSection={<IconEdit className="w-4" />}
                    >
                      {texts.chat.newChat}
                    </Button>
                  </div>

                  <div className="grow overflow-y-auto p-2">
                    <ConversationItems />
                  </div>
                  <div className="p-2" onClick={(e) => e.stopPropagation()}>
                    <ProfileButton section="chat" onClearConversations={removeAllChats.mutate} />
                  </div>
                </div>
              ) : (
                <PromptSidebar
                  onCreatePrompt={() => setCreatePromptModalOpen(true)}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  minRating={minRating}
                  setMinRating={setMinRating}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                />
              )}
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
            ) : leftSidebarTab === 'prompts' ? (
              <PromptLibrary
                onPromptSelect={(prompt: Prompt) => {
                  // Navigate to new chat with the selected prompt
                  void navigate('/chat/new', { state: { initialPrompt: prompt.content } });
                  setLeftSidebarTab('conversations');
                }}
                onCreatePrompt={() => setCreatePromptModalOpen(true)}
                searchTerm={searchTerm}
                selectedCategory={selectedCategory}
                minRating={minRating}
                sortBy={sortBy}
              />
            ) : (
              <Routes>
                <Route path="" element={<NewChatRedirect />} />
                <Route path="new" element={<NewChatRedirect />} />
                <Route
                  path=":id"
                  element={
                    <ConversationPage
                      textareaRef={textareaRef}
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
                  sidebarLeft
                    ? texts.common.hide(leftSidebarTab === 'conversations' ? texts.common.conversations : 'Prompts')
                    : texts.common.show(leftSidebarTab === 'conversations' ? texts.common.conversations : 'Prompts')
                }
              />
            )}
            {(!isMobileView || !sidebarLeft) && userBucket && leftSidebarTab === 'conversations' && (
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
                  <Files configurationId={selectedConfigurationId} userBucket={userBucket} conversationId={selectedChatId} />
                )
              )}
            </Panel>
          </>
        )}
      </PanelGroup>

      <CreatePromptModal opened={createPromptModalOpen} onClose={() => setCreatePromptModalOpen(false)} />
    </div>
  );
}
