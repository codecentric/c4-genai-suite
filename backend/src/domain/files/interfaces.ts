export type BucketType = 'general' | 'user' | 'conversation';

export type FileSizeLimits = {
  general: number;
} & Record<string, number>;

export enum FileUploadStatus {
  // file upload to rag service is in progress
  InProgress = 'inProgress',
  // file upload to rag service was completed successfully
  Successful = 'successful',
}

export interface Bucket {
  // The ID Of the bucket.
  id: number;

  // The display name.
  name: string;

  // The endpoint to the RAG server.
  endpoint: string;

  // The optional index name.
  indexName?: string;

  // // The optional headers.
  headers?: string;

  // Indicates if the bucket is the default.
  isDefault: boolean;

  // The quota per user.
  perUserQuota: number;

  // The file name extensions
  allowedFileNameExtensions?: string[];

  // The bucket type.
  type: BucketType;

  // File size limits per file type
  fileSizeLimits: FileSizeLimits;
}

export interface UploadedFileContent {
  buffer: string;
  original: boolean;
  type: string;
}

export interface UploadedFile {
  // The ID Of the file.
  id: number;

  // The file name for searching.
  fileName: string;

  // The file size in bytes.
  fileSize: number;

  // The mime type.
  mimeType: string;

  // The date time when the file has been uploaded.
  uploadedAt: Date;

  // The processed or original content of the file
  content?: UploadedFileContent[];

  // The status of the file in relation to the RAG-Service
  uploadStatus: FileUploadStatus;

  externalDocumentId: number;
}

export interface SearchResult {
  // The actual content.
  content: string;

  // The metadata.
  metadata: any;
}

export interface FileType {
  value: string;
  label: string;
}
