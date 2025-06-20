import { FileDto } from 'src/api';

export function extractType(file: FileDto): string {
  const parts = file.fileName.toLowerCase().split('.');
  if (parts.length > 1) {
    return parts.pop() ?? 'unknown';
  }
  return 'unknown';
}

/**
 * @description a none responsive way of checking the viewport for mobile size.
 * To implement the responsive version see: https://mantine.dev/hooks/use-media-query/
 */
export const isMobile = () => window.matchMedia('(max-width: 600px)').matches;
