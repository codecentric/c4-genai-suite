import { Bucket } from '../interfaces';
import { buildBucketSnapshot } from './utils';

function makeBucket(overrides: Partial<Bucket> = {}): Bucket {
  return {
    id: 1,
    name: 'Test Bucket',
    endpoint: 'https://rag.example.com',
    indexName: 'my-index',
    headers: undefined,
    isDefault: false,
    perUserQuota: 100,
    allowedFileNameExtensions: ['pdf', 'txt'],
    type: 'general',
    fileSizeLimits: { general: 10 },
    ...overrides,
  };
}

describe('buildBucketSnapshot', () => {
  describe('header redaction', () => {
    it('does not include headers in the snapshot when headers are set', () => {
      const snapshot = buildBucketSnapshot(makeBucket({ headers: 'Authorization=Bearer secret-token' }));

      expect(snapshot).not.toHaveProperty('headers');
    });

    it('does not include headers in the snapshot when headers are absent', () => {
      const snapshot = buildBucketSnapshot(makeBucket({ headers: undefined }));

      expect(snapshot).not.toHaveProperty('headers');
    });

    it('sets headersConfigured to true when headers are present', () => {
      const snapshot = buildBucketSnapshot(makeBucket({ headers: 'Authorization=Bearer secret-token' }));

      expect(snapshot.headersConfigured).toBe(true);
    });

    it('sets headersConfigured to false when headers are absent', () => {
      const snapshot = buildBucketSnapshot(makeBucket({ headers: undefined }));

      expect(snapshot.headersConfigured).toBe(false);
    });

    it('sets headersConfigured to false when headers are an empty string', () => {
      const snapshot = buildBucketSnapshot(makeBucket({ headers: '' }));

      expect(snapshot.headersConfigured).toBe(false);
    });
  });

  describe('non-sensitive field inclusion', () => {
    it('includes all non-sensitive bucket fields in the snapshot', () => {
      const bucket = makeBucket({ headers: 'Authorization=Bearer secret' });
      const snapshot = buildBucketSnapshot(bucket);

      expect(snapshot).toMatchObject({
        id: bucket.id,
        name: bucket.name,
        endpoint: bucket.endpoint,
        indexName: bucket.indexName,
        isDefault: bucket.isDefault,
        perUserQuota: bucket.perUserQuota,
        allowedFileNameExtensions: bucket.allowedFileNameExtensions,
        type: bucket.type,
        fileSizeLimits: bucket.fileSizeLimits,
      });
    });
  });
});
