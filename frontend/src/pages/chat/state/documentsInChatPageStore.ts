// TODO refactor state of documents/sources information related to the ChatPage

import { createStore } from 'zustand';

import { DocumentSource } from '../SourcesChunkPreview';
import { SourceDto } from 'src/api';

type DocumentsInChatState = {
  selectedDocument: DocumentSource | undefined;
  selectedSource: SourceDto | undefined;
};

type DocumentsInChatActions = {
  setSelectedDocument: (document: DocumentSource | undefined) => void;
  setSelectedSource: (source: SourceDto | undefined) => void;
};

type DocumentsInChatStore = DocumentsInChatState & DocumentsInChatActions;

const documentsInChatStore_ = createStore<DocumentsInChatStore>()((set) => ({
  selectedDocument: undefined,
  selectedSource: undefined,
  setSelectedDocument: (selectedDocument) => {
    // TODO delete after debugging
    console.group(`documentInChatStore: selectedDocument | documentUri: ${selectedDocument?.documentUri}`);
    console.log(selectedDocument);
    console.groupEnd();
    set({ selectedDocument });
  },
  setSelectedSource: (selectedSource) => {
    // TODO delete after debugging
    // console.group(`documentInChatStore: selectedSource ${selectedSource?.metadata?.title}`);
    // console.log(selectedSource);
    // console.groupEnd();
    set({ selectedSource });
  },
}));

export const documentsInChatStore = documentsInChatStore_;
