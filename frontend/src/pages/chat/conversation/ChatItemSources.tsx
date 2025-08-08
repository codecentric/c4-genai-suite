/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import React, { useMemo } from 'react';

import { SourceDto } from 'src/api';
import Source from 'src/pages/chat/conversation/Source';
import { texts } from 'src/texts';

const ChatItemSources: React.FC<{ sources: SourceDto[]; selectDocument: (documentUri: string) => void }> = ({
  sources,
  selectDocument,
}) => {
  const uniqueSources = useMemo(() => mergeIdenticalSources(sources), [sources]);

  if (!uniqueSources || uniqueSources.length === 0) return null;

  return (
    <div className="mt-2 mb-2 rounded-2xl border-2 p-4 break-all" data-testid="sources-section">
      <h2 className="mb-4 text-xl font-bold">{texts.chat.sources.sources}</h2>
      <ul>
        {uniqueSources.map((source, index) => (
          <Source key={index} source={source} selectDocument={selectDocument} />
        ))}
      </ul>
    </div>
  );
};

export const mergeIdenticalSources = (sources: SourceDto[]): SourceDto[] => {
  if (!sources || sources.length === 0) return [];

  const uniqueSources: SourceDto[] = [];

  sources.forEach((source) => {
    const alreadyAddedSource = uniqueSources.find((s) => s.document?.uri && s.document.uri === source.document?.uri);
    source.metadata ??= {};
    source.metadata['pages'] = source.chunk.pages ?? [];

    if (!alreadyAddedSource) {
      uniqueSources.push(source);
    } else {
      alreadyAddedSource.metadata = mergeMetadata(alreadyAddedSource, source);
    }
  });
  uniqueSources.forEach((uniqueSource) => {
    const metadata = uniqueSource.metadata;
    if (metadata) {
      if (metadata['pages']) {
        metadata['pages'] = formatPages(toStringNumberArray(metadata['pages']) || []);
      }
    }
  });

  return uniqueSources;
};

const toStringNumberArray = (value: unknown): (string | number)[] | null => {
  if (Array.isArray(value) && value.every((v) => typeof v === 'string' || typeof v === 'number')) {
    return value;
  }
  return null;
};

const mergeMetadata = (source1: SourceDto, source2: SourceDto) => {
  const metadata1 = source1.metadata ? { ...source1.metadata } : {};
  const metadata2 = source2.metadata ? { ...source2.metadata } : {};

  const mergedMetadata: Record<string, unknown> = {};

  Object.keys(metadata1).forEach((key) => {
    if (!metadata2[key]) metadata2[key] = metadata1[key];
    const array1 = toStringNumberArray(metadata1[key]);
    const array2 = toStringNumberArray(metadata2[key]);
    if (array1 !== null || array2 !== null) {
      mergedMetadata[key] = mergeToStringArray(array1 || [], array2 || []);
    } else {
      const value1 = metadata1[key];
      const value2 = metadata2[key];
      mergedMetadata[key] = value1 !== value2 ? `${String(value1)}, ${String(value2)}` : value1;
    }
  });
  return { ...metadata2, ...mergedMetadata };
};

function mergeToStringArray(pages1: (string | number)[], pages2: (string | number)[]): string[] {
  const convertToStringArray = (arr: (string | number)[]) => arr.map((item) => item.toString());
  return [...convertToStringArray(pages1), ...convertToStringArray(pages2)];
}

/**
 * Compresses a list of pages numbers into a string representing ranges and individual values.
 *
 * @example
 * Input: ["4", "5", "1", "3", "9", "7"]
 * Output: "1, 3-5, 7, 9"
 */
function formatPages(pages: (string | number)[]): string {
  if (!pages || pages.length === 0 || !Array.isArray(pages)) {
    return '';
  }
  const uniquePages = Array.from(new Set(pages.map((page) => Number(page)).filter((page) => Number(page)))).sort((a, b) => a - b);

  const ranges: string[] = [];
  let start = uniquePages[0];
  let end = uniquePages[0];

  const formatGroups = (start: number, end: number) => {
    if (start === end) {
      ranges.push(`${start}`);
    } else {
      ranges.push(`${start}-${end}`);
    }
  };

  for (let i = 1; i < uniquePages.length; i++) {
    if (uniquePages[i] === end + 1) {
      end = uniquePages[i];
    } else {
      formatGroups(start, end);
      start = uniquePages[i];
      end = uniquePages[i];
    }
  }
  formatGroups(start, end);

  return ranges.join(', ');
}

export default ChatItemSources;
