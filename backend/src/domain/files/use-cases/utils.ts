import { Agent, RequestInfo, RequestInit, fetch as undiciFetch } from 'undici';
import { BlobCategory, BucketEntity, FileEntity } from 'src/domain/database';
import { User } from 'src/domain/users';
import { Bucket } from '../interfaces';
import { Configuration, FilesApi, HTTPHeaders } from './generated';

export function buildBucket(source: BucketEntity): Bucket {
  return source;
}

export function buildFile(source: FileEntity) {
  const { createdAt: uploadedAt, ...other } = source;

  return {
    uploadedAt,
    ...other,
    content: source.blobs?.map((x) => ({
      buffer: x.buffer,
      original: x.category === BlobCategory.FILE_ORIGINAL,
      type: x.type,
    })),
  };
}

export function getBucketId(bucket: BucketEntity, user?: User, conversationId?: number) {
  let ragBucket = bucket.id.toString();

  if (user) {
    ragBucket = `${bucket.id}/${user.id}`;
  }

  if (conversationId) {
    ragBucket += `/${conversationId}`;
  }

  return ragBucket;
}

export function buildClient(bucket: Pick<BucketEntity, 'headers' | 'endpoint'>) {
  const headers: HTTPHeaders = {};

  if (bucket.headers) {
    for (const pair of bucket.headers.split(/[,;\n]/)) {
      const [key, value] = pair.trim().split('=');

      if (key && value) {
        headers[key.trim()] = value.trim();
      }
    }
  }

  const api = new FilesApi(
    new Configuration({
      headers,
      fetchApi: async (request, init) => {
        // FIXME we need a better concept than long lasting connections
        const timeout = 3 * 60 * 60 * 1000;
        // This method is only called from the generated API-Clients with hardcoded
        // paths, so there should be no risk of SSRF
        // nosemgrep: nodejs_scan.javascript-ssrf-rule-node_ssrf
        const result = await undiciFetch(request as RequestInfo, {
          ...(init as RequestInit),
          dispatcher: new Agent({
            bodyTimeout: timeout,
            headersTimeout: timeout,
            connect: {
              rejectUnauthorized: false,
            },
          }),
        });

        return result as unknown as Response;
      },
      basePath: bucket.endpoint,
    }),
  );

  return api;
}
