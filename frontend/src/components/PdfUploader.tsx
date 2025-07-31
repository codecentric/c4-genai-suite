import { Button } from '@mantine/core';
import React, { useState } from 'react';

import { Document, Page } from 'react-pdf';
import { pdfjs } from 'react-pdf';

import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

export function PdfUploader() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileUrl, setPdfFileUrl] = useState<string | null>(null);

  const [scale, _setScale] = useState<number>(1.0);
  const [_numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, _setPageNumber] = useState<number>(1);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="input-group">
        <label htmlFor="file_upload">Choose a PDF File to upload. </label>
        <input id="file_upload" type="file" accept="application/pdf" style={{ opacity: 0 }} onChange={handlePdfFileChange} />
      </div>
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
      {pdfFileUrl && displayPdfViewer && (
        <div className="pdf-viewer">
          <Document file={pdfFileUrl} onLoadSuccess={onDocumentLoadSuccess} onLoadError={console.error}>
            <Page pageNumber={pageNumber} scale={scale} />
          </Document>
        </div>
      )}
    </div>
  );
}
