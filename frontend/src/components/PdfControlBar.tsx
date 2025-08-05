import { ActionIcon, CSSProperties, Divider, Group, NumberInput } from '@mantine/core';
import {
  IconArrowBarToLeft,
  IconArrowBarToRight,
  IconArrowLeft,
  IconArrowRight,
  IconZoomIn,
  IconZoomOut,
  IconZoomReset,
} from '@tabler/icons-react';

import type { File } from 'react-pdf/dist/shared/types.js';

interface IconConfigurationProps {
  style?: CSSProperties | undefined;
  stroke?: number;
}

interface PdfControlBarProps {
  file: File;
  pageNumber: number;
  numPages: number | null;
  setPageNumber: (pageNumber: any) => void;
  scale: number;
  setScale: (scale: any) => void;
}

interface PdfZoomLevelProps {
  minZoomLvl: number;
  maxZoomLvl: number;
}

const PdfControlBar = ({ file, pageNumber, numPages, setPageNumber, scale, setScale }: PdfControlBarProps) => {
  const iconConfigurationParams: IconConfigurationProps = {
    style: { width: '70%', height: '70%' },
    stroke: 1.5,
  };

  const zoomConfigurationParams: PdfZoomLevelProps = {
    minZoomLvl: 0.6,
    maxZoomLvl: 4.0,
  };

  const isFirstPage = pageNumber === 1;
  const isLastPage = pageNumber === numPages;

  const isMinZoom = scale < zoomConfigurationParams.minZoomLvl;
  const isMaxZoom = scale >= zoomConfigurationParams.maxZoomLvl;

  const goToFirstPage = () => {
    if (!isFirstPage) {
      setPageNumber(1);
    }
  };
  const goToPreviousPage = () => {
    if (!isFirstPage) {
      setPageNumber(pageNumber - 1);
    }
  };
  const goToNextPage = () => {
    if (!isLastPage) {
      setPageNumber(pageNumber + 1);
    }
  };
  const goToLastPage = () => {
    if (!isLastPage && numPages) {
      setPageNumber(numPages);
    }
  };

  const zoomOut = () => {
    if (!isMinZoom) {
      setScale(roundTo(scale - 0.1));
    }
  };
  const zoomIn = () => {
    if (!isMaxZoom) {
      setScale(roundTo(scale + 0.1));
    }
  };

  const resetZoom = () => {
    if (scale != 1.0) {
      setScale(roundTo(1.0));
    }
  };

  const roundTo = (inputNumber: number, precision: number = 2) => {
    const factor = Math.pow(10, precision);
    return Math.round(inputNumber * factor) / factor;
  };

  return (
    <div className="control-panel m-3 flex items-baseline justify-between p-3">
      <div className="flex items-baseline justify-between">
        <Group className="pdf-ctrl-bar" gap="s">
          <Group className="doc-navigation" gap="xs">
            <Group className="doc-navigation-btns">
              <ActionIcon onClick={goToFirstPage} aria-label="go to first page" variant="filled" disabled={isFirstPage}>
                <IconArrowBarToLeft {...iconConfigurationParams} />
              </ActionIcon>
              <ActionIcon onClick={goToPreviousPage} aria-label="go to previous page" variant="filled" disabled={isFirstPage}>
                <IconArrowLeft {...iconConfigurationParams} />
              </ActionIcon>
            </Group>
            <NumberInput
              className="mx-2 p-0 pl-1"
              value={pageNumber}
              min={1}
              max={numPages ?? 1}
              onChange={setPageNumber}
              clampBehavior="strict"
              hideControls
            />
            {`/ ${numPages}`}
            <Group className="doc-navigation-btns" gap="xs">
              <ActionIcon onClick={goToNextPage} aria-label="go to next page" variant="filled" disabled={isLastPage}>
                <IconArrowRight {...iconConfigurationParams} />
              </ActionIcon>
              <ActionIcon onClick={goToLastPage} aria-label="go to last page" variant="filled" disabled={isLastPage}>
                <IconArrowBarToRight {...iconConfigurationParams} />
              </ActionIcon>
            </Group>
          </Group>

          <Group className="zoom-level-ctrl" gap="xs">
            <ActionIcon onClick={zoomOut} variant="filled" aria-label="zoom out" disabled={isMinZoom}>
              <IconZoomOut {...iconConfigurationParams} />
            </ActionIcon>
            <NumberInput
              className="mx-2 p-0 pl-1"
              value={scale}
              min={zoomConfigurationParams.minZoomLvl}
              max={zoomConfigurationParams.maxZoomLvl}
              decimalScale={1}
              fixedDecimalScale
              onChange={setScale}
              clampBehavior="strict"
              hideControls
            />
            <ActionIcon onClick={zoomIn} variant="filled" aria-label="zoom in" disabled={isMaxZoom}>
              <IconZoomIn {...iconConfigurationParams} />
            </ActionIcon>
            <Divider orientation="vertical" />
            <ActionIcon onClick={resetZoom} variant="filled" aria-label="rest zoom level" disabled={scale === 1}>
              <IconZoomReset {...iconConfigurationParams} />
            </ActionIcon>
          </Group>
        </Group>
      </div>
    </div>
  );
};

export default PdfControlBar;
