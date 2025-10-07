import { Logger } from '@nestjs/common';

const extractResponseBody = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await response.json();
  } else {
    return await response.text();
  }
};

const removeCredentials = (headers: HeadersInit): Record<string, string> => {
  const pattern = /(authorization|api-?key|token|secret|cookie)/i;

  const sanitizedHeaders: Record<string, string> = {};
  new Headers(headers).forEach((value, key) => {
    const lk = key.toLowerCase();
    if (pattern.test(lk)) {
      return;
    }
    sanitizedHeaders[key] = value;
  });
  return sanitizedHeaders;
};

const logger = new Logger('DebugModelRequestLogging');

export const fetchWithDebugLogging =
  (extensionName: string) => async (url: string | Request | URL, options: RequestInit | undefined) => {
    const response = await fetch(url, options);
    if (process.env.DEBUG_MODEL_REQUESTS) {
      const clonedResponse = response.clone();
      logger.log('Model request', {
        extensionName,
        url,
        requestHeaders: removeCredentials(options?.headers ?? {}),
        requestBody: JSON.parse(options?.body as string) as unknown,
        responseHeaders: [...clonedResponse.headers.entries()],
        responseBody: await extractResponseBody(clonedResponse),
      });
    }
    return response;
  };
