import { useQuery } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FileDto, FileDtoUploadStatusEnum } from 'src/api';
import { render } from 'src/pages/admin/test-utils';
import { Files } from 'src/pages/chat/files/Files';
import { useFileIdSelector } from 'src/pages/chat/files/useFileIdSelector';

vi.mock(import('@tanstack/react-query'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});
vi.mock('src/hooks/api/extensions', () => ({
  useConversationBucketAvailabilities: vi.fn().mockReturnValue({
    isLoading: false,
    data: {
      extensions: [],
    },
  }),
}));

// import { useConversationBucketAvailabilities } from 'src/hooks/api/extensions';
vi.mock('src/api', () => ({
  useApi: vi.fn(() => ({})),
}));

vi.mock('src/pages/chat/files/useFileIdSelector', () => ({
  useFileIdSelector: vi.fn(),
}));

const mockFiles = (files: FileDto[]) => {
  const mockQueryResult: ReturnType<typeof useQuery> = {
    data: { items: files, total: files.length },
  } as ReturnType<typeof useQuery>;

  vi.mocked(useQuery).mockReturnValue(mockQueryResult);
};

const mockSelectedFiles = (selectedIDs: number[]) => {
  vi.mocked(useFileIdSelector).mockImplementation(() => ({
    selectedIDs,
    selectId: vi.fn(),
    deselectId: vi.fn(),
    toggleIdSelection: vi.fn(),
  }));
};

const mockFilesAndSelectedFiles = (files: FileDto[], selectedIDs: number[]) => {
  mockFiles(files);
  mockSelectedFiles(selectedIDs);
};

describe('The Select/Deselect all files Buttons', () => {
  const mockedFiles = [
    { id: 1, fileName: 'test1.txt', uploadedAt: new Date(), fileSize: 100, mimeType: 'text/plain', externalDocumentId: 1 },
    { id: 2, fileName: 'test2.txt', uploadedAt: new Date(), fileSize: 100, mimeType: 'text/plain', externalDocumentId: 2 },
  ];

  const renderAndExpectButtons = () => {
    render(
      <Files
        conversationId={1}
        userBucket={{ extensionId: 1, title: 'Conversation Files', fileNameExtensions: [] }}
        configurationId={0}
      />,
    );
    const buttonSelectAll = screen.getByRole('button', { name: 'Select all' });
    const buttonDeselectAll = screen.getByRole('button', { name: 'Deselect all' });
    expect(buttonSelectAll).toBeInTheDocument();
    expect(buttonDeselectAll).toBeInTheDocument();
    return { buttonSelectAll, buttonDeselectAll };
  };

  it('will not be visible if no files are uploaded', () => {
    mockFilesAndSelectedFiles([], []);
    render(
      <Files
        conversationId={1}
        userBucket={{ extensionId: 1, title: 'Conversation Files', fileNameExtensions: [] }}
        configurationId={0}
      />,
    );
    expect(screen.queryByText('Select all')).not.toBeInTheDocument();
    expect(screen.queryByText('Deselect all')).not.toBeInTheDocument();
  });

  it("will have only the option 'Select All' enabled, if no file is selected", () => {
    mockFilesAndSelectedFiles(mockedFiles, []);
    const { buttonSelectAll, buttonDeselectAll } = renderAndExpectButtons();
    expect(buttonSelectAll).toBeEnabled();
    expect(buttonDeselectAll).toBeDisabled();
  });

  it("will have only the option 'Deselect All' enabled, if all files are selected", () => {
    mockFilesAndSelectedFiles(mockedFiles, [1, 2]);
    const { buttonSelectAll, buttonDeselectAll } = renderAndExpectButtons();
    expect(buttonSelectAll).toBeDisabled();
    expect(buttonDeselectAll).toBeEnabled();
  });

  it('will have both options enabled, if some of the files are selected', () => {
    mockFilesAndSelectedFiles(mockedFiles, [1]);
    const { buttonSelectAll, buttonDeselectAll } = renderAndExpectButtons();
    expect(buttonSelectAll).toBeEnabled();
    expect(buttonDeselectAll).toBeEnabled();
  });
});

describe('The user files sidebar', () => {
  const mockedFilesSuccessful = [
    {
      id: 1,
      fileName: 'test1.txt',
      uploadedAt: new Date(),
      fileSize: 100,
      mimeType: 'text/plain',
      uploadStatus: 'successful' as FileDtoUploadStatusEnum,
      externalDocumentId: 1,
    },
    {
      id: 2,
      fileName: 'test2.txt',
      uploadedAt: new Date(),
      fileSize: 100,
      mimeType: 'text/plain',
      uploadStatus: 'successful' as FileDtoUploadStatusEnum,
      externalDocumentId: 2,
    },
  ];

  const mockedFilesUploading = [
    {
      id: 1,
      fileName: 'test3.txt',
      uploadedAt: new Date(),
      fileSize: 100,
      mimeType: 'text/plain',
      uploadStatus: 'successful' as FileDtoUploadStatusEnum,
      externalDocumentId: 1,
    },
    {
      id: 2,
      fileName: 'test4.txt',
      uploadedAt: new Date(),
      fileSize: 100,
      mimeType: 'text/plain',
      uploadStatus: 'inProgress' as FileDtoUploadStatusEnum,
      externalDocumentId: 2,
    },
  ];

  it('will not have any indication of the uploading file, because no file is uploading', () => {
    mockFiles(mockedFilesSuccessful);
    render(
      <Files
        conversationId={1}
        userBucket={{ extensionId: 1, title: 'Conversation Files', fileNameExtensions: [] }}
        configurationId={0}
      />,
    );
    expect(screen.getByText('test1.txt')).toBeInTheDocument();
    expect(screen.getByText('test2.txt')).toBeInTheDocument();
    expect(screen.queryByText('Uploading File')).not.toBeInTheDocument();
  });

  it('will have an indication of the uploading file', () => {
    mockFiles(mockedFilesUploading);
    render(
      <Files
        conversationId={1}
        userBucket={{ extensionId: 1, title: 'Conversation Files', fileNameExtensions: [] }}
        configurationId={0}
      />,
    );
    expect(screen.getByText('test3.txt')).toBeInTheDocument();
    expect(screen.getByText('test4.txt')).toBeInTheDocument();
    expect(screen.getByText('Uploading File')).toBeInTheDocument();
  });
});
