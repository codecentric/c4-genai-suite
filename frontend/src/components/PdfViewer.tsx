import { Button, Card } from '@mantine/core';
import React, { useState } from 'react';

import { Document, Page } from 'react-pdf';
import { pdfjs } from 'react-pdf';

import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import PdfControlBar from './PdfControlBar';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

interface PdfViewerProps {
  file?: File;
}

export function PdfViewer({ file }: PdfViewerProps) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileUrl, setPdfFileUrl] = useState<string | null>(null);

  const [scale, setScale] = useState<number>(1.0);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [_isLoading, setIsLoading] = useState<boolean>(true);
  const [displayPdfViewer, setDisplayPdfViewer] = useState<boolean>(false);

  const handlePdfFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      console.log('A PDF File has been selected');
      setPdfFile(event.target.files[0]);
    }
  };

  const handlePdfUpload = () => {
    if (pdfFile) {
      try {
        if (pdfFile.type === 'application/pdf') {
          const fileUrl = URL.createObjectURL(pdfFile);
          setPdfFileUrl(fileUrl);
          setDisplayPdfViewer((prevVal) => !prevVal);
        } else {
          alert('Please upload a valid PDF file.');
        }

        const formData = new FormData();
        formData.append('pdfFile', pdfFile);
      } catch (error) {
        console.error(error);
      }
    }
  };

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setIsLoading(false);
  }

  //  w-full max-w-[min(800px,_100%)] grow overflow-auto

  return (
    <Card withBorder mt="sm" mr="xs" ml="6">
      <Card.Section className="input-group" withBorder inheritPadding py="xs">
        <label htmlFor="file_upload">Choose a PDF File to upload. </label>
        <input id="file_upload" type="file" accept="application/pdf" style={{ opacity: 0 }} onChange={handlePdfFileChange} />
        <div className="file-metadata">
          {pdfFile && (
            <section>
              File details:
              <ul>
                <li>Name: {pdfFile.name}</li>
                <li>Type: {pdfFile.type}</li>
                <li>Size: {pdfFile.size}</li>
              </ul>
            </section>
          )}
          {pdfFile && (
            <Button onClick={handlePdfUpload} className="submit">
              Display PDF file: {pdfFile.name}
            </Button>
          )}
          {pdfFileUrl && (
            <Button
              onClick={() => {
                setDisplayPdfViewer((prevVal) => !prevVal);
              }}
            >
              Hide PDF Viewer
            </Button>
          )}
        </div>
      </Card.Section>
      {pdfFileUrl && displayPdfViewer && (
        <div className="pdf-viewer">
          <PdfControlBar
            file={pdfFileUrl}
            numPages={numPages}
            pageNumber={pageNumber}
            scale={scale}
            setPageNumber={setPageNumber}
            setScale={setScale}
          />
          <div className="pdf-viewport" style={{ outline: 'solid 1px red', overflow: 'auto', width: '650px', height: '886px' }}>
            {/* Arbitrary width value -- For Test purposes ONLY */}
            <Document file={pdfFileUrl} onLoadSuccess={onDocumentLoadSuccess} onLoadError={console.error}>
              <Page pageNumber={pageNumber} scale={scale} />
            </Document>
          </div>
        </div>
      )}
    </Card>
  );
}
