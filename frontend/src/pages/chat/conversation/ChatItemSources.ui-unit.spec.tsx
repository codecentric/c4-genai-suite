import { describe, expect, it } from 'vitest';
import { SourceDto } from 'src/api';
import { mergeIdenticalSources } from './ChatItemSources';

describe('mergeIdenticalSources', () => {
  it('should return an empty array if the input is empty', () => {
    const result = mergeIdenticalSources([]);
    expect(result).toEqual([]);
  });

  it('should merge metadata and pages of sources with identical identities', () => {
    const sources: SourceDto[] = [
      {
        title: 'Source 1',
        chunk: { uri: '1', content: '', pages: [1, 2] },
        document: { name: 'file1', uri: 'doc1', mimeType: 'text/plain' },
        metadata: { key1: 'value1' },
      },
      {
        title: 'Source 1',
        chunk: { uri: '2', content: '', pages: [4] },
        document: { name: 'file1', uri: 'doc1', mimeType: 'text/plain' },
        metadata: { key1: 'value1' },
      },
    ];

    const result = mergeIdenticalSources(sources);
    expect(result).toEqual([
      {
        chunk: {
          content: '',
          pages: [1, 2],
          uri: '1',
        },
        document: {
          mimeType: 'text/plain',
          name: 'file1',
          uri: 'doc1',
        },
        metadata: {
          key1: 'value1',
          pages: '1-2, 4',
        },
        title: 'Source 1',
      },
    ]);
  });

  it('should merge pages correctly and format them as ranges', () => {
    const sources: SourceDto[] = [
      {
        title: 'Source 1',
        document: { uri: 'systemA', mimeType: 'text/plain' },
        chunk: { pages: [1, 3, 5], content: '' },
        metadata: {},
      },
      {
        title: 'Source 2',
        document: { uri: 'systemB', mimeType: 'text/plain' },
        chunk: { pages: [5, 4, 1], content: '' },
        metadata: {},
      },
      {
        title: 'Source 1',
        document: { uri: 'systemA', mimeType: 'text/plain' },
        chunk: { pages: [2, 4, 6], content: '' },
        metadata: {},
      },
    ];

    const result = mergeIdenticalSources(sources);
    expect(result).toEqual([
      {
        chunk: {
          content: '',
          pages: [1, 3, 5],
        },
        document: {
          mimeType: 'text/plain',
          uri: 'systemA',
        },
        metadata: {
          pages: '1-6',
        },
        title: 'Source 1',
      },
      {
        chunk: {
          content: '',
          pages: [5, 4, 1],
        },
        document: {
          mimeType: 'text/plain',
          uri: 'systemB',
        },
        metadata: {
          pages: '1, 4-5',
        },
        title: 'Source 2',
      },
    ]);
  });

  it('should not merge different sources', () => {
    const sources: SourceDto[] = [
      {
        title: 'Source 1',
        document: { uri: 'systemA', mimeType: 'text/plain' },
        chunk: { content: '', uri: 'file1', pages: [1, 3, 5] },
        metadata: {},
      },
      {
        title: 'Source 2',
        document: { uri: 'systemB', mimeType: 'text/plain' },
        chunk: { content: '', uri: 'file2', pages: [5, 4, 1] },
        metadata: {},
      },
    ];

    const result = mergeIdenticalSources(sources);
    expect(result).toEqual(sources);
  });

  it('should merge different metadata values of sources with identical identities', () => {
    const sources: SourceDto[] = [
      {
        title: 'Source 1',
        document: { uri: 'systemA', mimeType: 'text/plain' },
        chunk: { uri: 'file1', pages: [1, 2], content: '' },
        metadata: { key1: 'oneValue', pages: ['1', '2'] },
      },
      {
        title: 'Source 1',
        document: { uri: 'systemA', mimeType: 'text/plain' },
        chunk: { uri: 'file1', pages: [4], content: '' },
        metadata: { key1: 'otherValue', pages: ['4'] },
      },
    ];

    const result = mergeIdenticalSources(sources);
    expect(result).toEqual([
      {
        chunk: {
          content: '',
          pages: [1, 2],
          uri: 'file1',
        },
        document: {
          mimeType: 'text/plain',
          uri: 'systemA',
        },
        metadata: {
          key1: 'oneValue, otherValue',
          pages: '1-2, 4',
        },
        title: 'Source 1',
      },
    ]);
  });

  it('should handle bad data input for pages (1)', () => {
    const sources: SourceDto[] = [
      {
        title: 'Source 1',
        document: { uri: 'systemA', mimeType: 'text/plain' },
        chunk: { uri: 'file1', pages: [1, 2], content: '' },
        metadata: { key1: 'value1' },
      },
      {
        title: 'Source 1',
        document: { uri: 'systemA', mimeType: 'text/plain' },
        chunk: { uri: 'file1', pages: [false, 5] as unknown as number[], content: '' },
        metadata: { key1: 'value1' },
      },
    ];

    const result = mergeIdenticalSources(sources);
    expect(result).toEqual([
      {
        title: 'Source 1',
        chunk: {
          content: '',
          pages: [1, 2],
          uri: 'file1',
        },
        document: {
          mimeType: 'text/plain',
          uri: 'systemA',
        },
        metadata: { key1: 'value1', pages: '1-2' },
      },
    ]);
  });

  it('should handle bad data input for pages (2)', () => {
    const sources: SourceDto[] = [
      {
        title: 'Source 1',
        document: { uri: 'systemA', mimeType: 'text/plain' },
        chunk: { uri: 'file1', pages: [false] as unknown as number[], content: '' },
        metadata: { key1: 'value1' },
      },
      {
        title: 'Source 1',
        document: { uri: 'systemA', mimeType: 'text/plain' },
        chunk: { uri: 'file1', pages: [1, 5], content: '' },
        metadata: { key1: 'value1' },
      },
    ];

    const result = mergeIdenticalSources(sources);
    expect(result).toEqual([
      {
        title: 'Source 1',
        chunk: {
          content: '',
          pages: [false],
          uri: 'file1',
        },
        document: {
          mimeType: 'text/plain',
          uri: 'systemA',
        },
        metadata: { key1: 'value1', pages: '1, 5' },
      },
    ]);
  });

  it('should keep all metadata values from first source page', () => {
    const sources: SourceDto[] = [
      {
        title: 'Source 1',
        document: { uri: 'systemA', mimeType: 'text/plain' },
        chunk: { uri: 'file1', content: '' },
        metadata: { key1: 'value1', key2: 'value2' },
      },
      {
        title: 'Source 1',
        document: { uri: 'systemA', mimeType: 'text/plain' },
        chunk: { uri: 'file1', content: '' },
        metadata: { key1: 'value1' },
      },
    ];

    const result = mergeIdenticalSources(sources);
    expect(result).toEqual([
      {
        chunk: {
          content: '',
          uri: 'file1',
        },
        document: {
          mimeType: 'text/plain',
          uri: 'systemA',
        },
        metadata: {
          key1: 'value1',
          key2: 'value2',
          pages: '',
        },
        title: 'Source 1',
      },
    ]);
  });

  it('should keep all metadata values from second source page', () => {
    const sources: SourceDto[] = [
      {
        title: 'Source 1',
        document: { uri: 'systemA', mimeType: 'text/plain' },
        chunk: { uri: 'file1', content: '' },
        metadata: { key1: 'value1' },
      },
      {
        title: 'Source 1',
        document: { uri: 'systemA', mimeType: 'text/plain' },
        chunk: { uri: 'file1', content: '' },
        metadata: { key1: 'value1', key2: 'value2' },
      },
    ];

    const result = mergeIdenticalSources(sources);
    expect(result).toEqual([
      {
        chunk: {
          content: '',
          uri: 'file1',
        },
        document: {
          mimeType: 'text/plain',
          uri: 'systemA',
        },
        metadata: {
          key1: 'value1',
          key2: 'value2',
          pages: '',
        },
        title: 'Source 1',
      },
    ]);
  });

  it('should keep all metadata values from all source pages', () => {
    const sources: SourceDto[] = [
      {
        title: 'Source 1',
        document: { uri: 'systemA', mimeType: 'text/plain' },
        chunk: { uri: 'file1', content: '' },
        metadata: { key1: 'value1', keyA: 'valueA' },
      },
      {
        title: 'Source 1',
        document: { uri: 'systemA', mimeType: 'text/plain' },
        chunk: { uri: 'file1', content: '' },
        metadata: { key1: 'value1', keyB: 'valueB' },
      },
    ];

    const result = mergeIdenticalSources(sources);
    expect(result).toEqual([
      {
        chunk: {
          content: '',
          uri: 'file1',
        },
        document: {
          mimeType: 'text/plain',
          uri: 'systemA',
        },
        metadata: {
          key1: 'value1',
          keyA: 'valueA',
          keyB: 'valueB',
          pages: '',
        },
        title: 'Source 1',
      },
    ]);
  });
});
