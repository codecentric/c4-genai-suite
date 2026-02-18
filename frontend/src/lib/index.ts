import { FormErrors } from '@mantine/form';
import { type ClassValue, clsx } from 'clsx';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { twMerge } from 'tailwind-merge';
import { infer as ZodInfer, ZodTypeAny } from 'zod';
import { ResponseError } from 'src/api';
import { texts } from 'src/texts';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isString(value: unknown): value is string {
  return typeof value === 'string' || value instanceof String;
}

export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function formatFileSize(value: number, factor = 1024) {
  let u = 0;

  while (value >= factor || -value >= factor) {
    value /= factor;
    u++;
  }

  return (u ? `${value.toFixed(1)} ` : value) + ' kMGTPEZY'[u] + 'B';
}

/**
 * Downloads data as a JSON file.
 */
export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Sanitizes a string for use as a filename (keeps alphanumerics, hyphens, underscores, spaces).
 */
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9\-_ ]/g, '_');
}

export async function buildError(common: string, details?: string | Error | null) {
  let detailString: string | null = null;
  if (isString(details)) {
    detailString = details;
  } else if (details instanceof ResponseError) {
    try {
      const response = (await details.response.json()) as { message: string | string[] };

      if (isArray(response.message)) {
        detailString = response.message.join(', ');
      } else if (isString(response.message)) {
        detailString = response.message;
      }
    } catch {
      console.error('Server response is an not a JSON object.');
    }
  }

  let result = common;
  if (isString(detailString)) {
    if (result.endsWith('.')) {
      result = result.substring(0, result.length - 1);
    }

    result = `${result}: ${detailString}`;
  }

  if (!result.endsWith('.')) {
    result = `${result}.`;
  }

  return result;
}

export function formatBoolean(value: boolean) {
  return value ? texts.common.yes : texts.common.no;
}

export function typedZodResolver<S extends ZodTypeAny>(schema: S): (values: ZodInfer<S>) => FormErrors {
  const base = zod4Resolver(schema);
  return (values: ZodInfer<S>) => base(values as Parameters<typeof base>[0]);
}
