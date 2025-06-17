import { Button } from '@mantine/core';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { BucketDto, BucketDtoTypeEnum, FileDto, useApi } from 'src/api';
import { ConfirmDialog, Pagingation } from 'src/components';
import { useEventCallback, useTransientNavigate } from 'src/hooks';
import { buildError } from 'src/lib';
import { texts } from 'src/texts';
import { FileCard } from './FileCard';
import { UpsertBucketDialog } from './UpsertBucketDialog';
import { useBucketstore, useFilesStore } from './state';

export function FilesPage() {
  const api = useApi();
  const pageSize = 20;

  const bucketParam = useParams<'id'>();
  const bucketId = +bucketParam.id!;
  const [uploading, setUploading] = useState<File[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const { files, removeFile, setFile, setFiles } = useFilesStore();

  const navigate = useTransientNavigate();
  const [toUpdate, setToUpdate] = useState<boolean>();
  const [thisBucket, setThisBucket] = useState<BucketDto | null>(null);
  const { buckets, removeBucket, setBucket } = useBucketstore();

  const { data: bucket } = useQuery({
    queryKey: ['bucket', bucketId],
    queryFn: () => api.files.getBucket(bucketId),
  });

  useEffect(() => {
    if (bucket) {
      const updatedBucket = buckets.find((b) => b.id == bucket.id);
      if (updatedBucket) {
        setThisBucket(updatedBucket);
      }
    }
  }, [bucket, buckets]);

  const deletingBucket = useMutation({
    mutationFn: (bucket: BucketDto) => {
      return api.files.deleteBucket(bucket.id);
    },
    onSuccess: (_, bucket) => {
      removeBucket(bucket.id);
      navigate('/admin/files/');
    },
    onError: async (error) => {
      toast.error(await buildError(texts.files.removeBucketFailed, error));
    },
  });

  const doClose = useEventCallback(() => {
    setToUpdate(false);
  });

  const { data: loadedFiles } = useQuery({
    // we need to requery when the total changed (because we uploaded/deleted one)
    queryKey: ['files', bucketId, page, pageSize, total],
    queryFn: () => api.files.getFiles(bucketId, page, pageSize),
  });

  useEffect(() => {
    if (loadedFiles) {
      setFiles(loadedFiles.items);
      setTotal(loadedFiles.total);
    }
  }, [loadedFiles, setFiles, setTotal]);

  const upload = useMutation({
    mutationFn: (file: File) => api.files.postFile(bucketId, file),
    onMutate: (file) => {
      setUploading((files) => [...files, file]);
    },
    onSuccess: (file) => {
      setFile(file);
      setTotal((t) => t + 1);
    },
    onSettled: (_, __, file) => {
      setUploading((files) => files.filter((f) => f !== file));
    },
    onError: async (error, file) => {
      toast.error(await buildError(`${texts.files.uploadFailed} '${file.name}'`, error));
    },
  });

  const deleting = useMutation({
    mutationFn: (file: FileDto) => {
      return api.files.deleteFile(bucketId, file.id);
    },
    onSuccess: (_, bucket) => {
      removeFile(bucket.id);
      setTotal((t) => t - 1);
    },
    onError: async (error) => {
      toast.error(await buildError(texts.files.removeFileFailed, error));
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files.forEach((file) => upload.mutate(file)),
  });

  return (
    <>
      {thisBucket && (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-8">
            <div className="flex items-end justify-between">
              <h2 className="text-3xl">{thisBucket.name}</h2>
              <div className="flex gap-2">
                <Button variant="light" leftSection={<IconEdit size={20} />} onClick={() => setToUpdate(true)}>
                  {texts.common.edit}
                </Button>
                <ConfirmDialog
                  title={texts.files.removeBucketConfirmTitle}
                  text={texts.files.removeBucketConfirmText}
                  onPerform={() => deletingBucket.mutate(thisBucket)}
                >
                  {({ onClick }) => (
                    <Button onClick={onClick} variant="light" color="red" leftSection={<IconTrash size={20} />}>
                      {texts.common.remove}
                    </Button>
                  )}
                </ConfirmDialog>
              </div>
            </div>
            <div className="flex min-h-full grow flex-wrap items-center gap-x-10 gap-y-2">
              {thisBucket.type === BucketDtoTypeEnum.General && (
                <BucketInfoByte title={texts.files.bucketType} value={'General'} />
              )}
              {thisBucket.type === BucketDtoTypeEnum.Conversation && (
                <BucketInfoByte title={texts.files.bucketType} value={'Chat'} />
              )}
              {thisBucket.type === BucketDtoTypeEnum.User && (
                <BucketInfoByte title={texts.files.bucketType} value={texts.common.userBucketBadge} />
              )}
              <BucketInfoByte title={texts.common.endpoint} value={thisBucket.endpoint} />
              {thisBucket.indexName && <BucketInfoByte title={texts.common.indexName} value={thisBucket.indexName} />}
            </div>
            {/* Don't show the Searchable Files heading for conversation buckets */}
            {thisBucket.type !== BucketDtoTypeEnum.Conversation && (
              <div className="my-4 flex">
                <h2 className="grow text-2xl">{texts.files.headlineSearchable}</h2>
              </div>
            )}
          </div>

          {/* only show the file upload dropzone if this is not a user/conversation bucket */}
          {thisBucket?.type !== BucketDtoTypeEnum.Conversation && thisBucket?.type !== BucketDtoTypeEnum.User && (
            <div
              className="rounded-box flex h-32 items-center justify-center border-2 border-dashed border-gray-300 p-4 text-gray-600 transition-all hover:border-gray-400"
              {...getRootProps()}
            >
              <input {...getInputProps()} />
              {isDragActive ? <p>{texts.common.dropZoneDrop}</p> : <p>{texts.common.dropZone}</p>}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {files.map((file) => (
              <FileCard key={file.id} file={file} onDelete={deleting.mutate} />
            ))}

            {uploading.map((file, i) => (
              <div
                key={i}
                className="rounded-box flex h-32 flex-col items-center justify-center gap-2 truncate bg-gray-200 p-8 text-sm text-gray-500"
              >
                {texts.files.uploading}

                <div>{file.name}</div>
              </div>
            ))}
          </div>
          <Pagingation page={page} pageSize={pageSize} total={total} onPage={setPage} />
        </div>
      )}

      {toUpdate && <UpsertBucketDialog onClose={doClose} onCreate={() => {}} target={thisBucket} onUpdate={setBucket} />}
    </>
  );
}

export function BucketInfoByte(props: { title: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="font-semibold">{props.title}</div>
      <div className="font-normal">{props.value}</div>
    </div>
  );
}
