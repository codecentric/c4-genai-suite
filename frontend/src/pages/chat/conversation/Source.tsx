import { Anchor } from '@mantine/core';
import React, { useState } from 'react';
import { SourceDto } from 'src/api';
import { Icon } from 'src/components';
import { texts } from 'src/texts';

const Source: React.FC<{
  source: SourceDto;
  selectDocument: (documentUri: string) => void;
}> = ({ source, selectDocument }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const metadataEntries = Object.entries(source.metadata ?? {}).filter(([, value]) => isValid(value));

  const hasMetadata = metadataEntries.length > 0;
  const toggle = () => setIsExpanded((e) => !e);
  const sourceChunksAvailable = !!source.document?.uri;
  return (
    <li className="mb-1 cursor-pointer rounded p-2 hover:bg-gray-100" onClick={toggle}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center">
          {hasMetadata && (
            <span className={`mr-2 transform text-xs transition-transform ${isExpanded ? 'rotate-90' : 'rotate-0'}`}>▶</span>
          )}
          {sourceChunksAvailable ? (
            <Anchor
              size="sm"
              onClick={(e) => {
                selectDocument(source.document?.uri ?? '');
                e.stopPropagation();
              }}
            >
              {source.title}
            </Anchor>
          ) : (
            <span>{source.title}</span>
          )}
        </div>
        {source.document?.link && (
          <a
            href={source.document.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700"
            onClick={(e) => e.stopPropagation()}
          >
            <Icon className="!-mb-[1px] inline-block align-baseline" icon="external-link" size={16} />
          </a>
        )}
      </div>
      {hasMetadata && isExpanded && (
        <div className="mt-2 pl-6 text-xs text-gray-600">
          <strong>{texts.chat.sources.metadata.metadata}:</strong>
          <div className="mt-2 mr-4 grid grid-cols-[auto,1fr] gap-x-4 gap-y-0.5">
            {metadataEntries.map(([key, value]) => {
              return (
                <React.Fragment key={key}>
                  <div className="font-medium text-gray-800 capitalize">{translateKey(key)}:</div>
                  <div className="font-light break-all text-gray-800">{value}</div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </li>
  );
};

function isValid(value: unknown) {
  return value !== undefined && value !== null && value !== '';
}

function translateKey(key: string) {
  const mappedKey = texts.chat.sources.metadata[key as keyof typeof texts.chat.sources.metadata] || key;
  return mappedKey.replaceAll('_', ' ');
}

export default Source;
