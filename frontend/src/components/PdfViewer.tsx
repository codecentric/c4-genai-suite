/* eslint-disable  @typescript-eslint/no-non-null-asserted-optional-chain */

import { ActionIcon, Button, Card, Group, Loader } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Document, Page, pdfjs } from 'react-pdf';

import { toast } from 'react-toastify';
import { SourceDto } from 'src/api/generated/models/SourceDto';
import { useDocument } from 'src/hooks/api/files';
import { DocumentSource } from 'src/pages/chat/SourcesChunkPreview';
import { Alert } from './Alert';
import PdfControlBar from './PdfControlBar';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

interface PdfViewerProps {
  selectedDocument?: DocumentSource;
  selectedSource?: SourceDto;
  onClose: () => void;
}

const VIEWPORT_STYLING_RULES = {
  minWidth: '25%',
};

export function PdfViewer({ selectedDocument, selectedSource: _selectedSource, onClose }: PdfViewerProps) {
  const { t } = useTranslation();

  const [pdfFileUrl, setPdfFileUrl] = useState<string | null>(null);

  const [scale, setScale] = useState<number>(1.0);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [displayPdfViewer, setDisplayPdfViewer] = useState<boolean>(true);

  const { data, isFetched, isError, isPending, refetch } = useDocument(
    // This is the reason to disable @typescript-eslint/no-non-null-asserted-optional-chain
    selectedDocument?.conversationId!,
    selectedDocument?.messageId!,
    selectedDocument?.documentUri!,
  );

  const handleSelectedPdfDocument = useCallback(() => {
    if (data && isFetched && !isError) {
      try {
        const documentData = data;
        if (documentData.type && documentData.type === 'application/pdf') {
          const documentUrl = URL.createObjectURL(documentData);
          setPdfFileUrl(documentUrl);
        } else {
          toast('Something went wrong while loading the PDF source document. Please try again.');
        }
      } catch (error) {
        console.error(error);
      }
    }
  }, [data, isFetched, isError]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  useEffect(() => {
    handleSelectedPdfDocument();
  }, [data, handleSelectedPdfDocument]);

  const container = (children: ReactNode) => (
    <Card withBorder mt="sm" mr="xs" ml="6">
      <Card.Section withBorder inheritPadding py="xs">
        <Group justify="flex-end">
          <ActionIcon onClick={onClose} variant="subtle" color="gray" aria-label="close">
            <IconX title="close" />
          </ActionIcon>
        </Group>
      </Card.Section>
      {children}
    </Card>
  );

  if (isError) {
    return container(
      <Alert text={t('common.errorLoading')} className="mt-4">
        <Button color="red" size="compact-xs" variant="light" mt="sm" onClick={() => refetch()}>
          {t('common.tryAgain')}
        </Button>
      </Alert>,
    );
  }

  if (isPending) {
    return container(<Loader className="mx-auto my-32" />);
  }

  return container(
    <>
      <Card.Section className="input-group" inheritPadding>
        <div className="viewer-ctrls">
          {data && (
            <PdfControlBar
              numPages={numPages}
              pageNumber={pageNumber}
              scale={scale}
              setPageNumber={setPageNumber}
              setScale={setScale}
              showViewer={displayPdfViewer}
              setShowViewer={setDisplayPdfViewer}
            />
          )}
        </div>
      </Card.Section>
      {pdfFileUrl && displayPdfViewer && (
        <Card.Section className="pdf-viewer pt-0 pr-4 pb-4 pl-4">
          <div className="pdf-viewport h-ful w-full overflow-auto border-1" style={VIEWPORT_STYLING_RULES}>
            <Document file={pdfFileUrl} onLoadSuccess={onDocumentLoadSuccess} onLoadError={console.error}>
              <Page pageNumber={pageNumber} scale={scale} />
            </Document>
          </div>
        </Card.Section>
      )}
    </>,
  );
}
