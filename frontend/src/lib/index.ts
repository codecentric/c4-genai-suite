import { FormErrors, zodResolver } from '@mantine/form';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AnyZodObject, infer as ZodInfer } from 'zod';
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

export function typedZodResolver<S extends AnyZodObject>(schema: S): (values: ZodInfer<S>) => FormErrors {
  return zodResolver(schema);
}
