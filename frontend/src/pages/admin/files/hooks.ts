import { useMutation } from '@tanstack/react-query';
import { Dispatch, SetStateAction } from 'react';
import { toast } from 'react-toastify';
import { BucketDto, FileDto, InitOverrideFunction } from 'src/api';
import { buildError } from 'src/lib';
import { texts } from 'src/texts';

type UseUploadingFileProps = {
  bucketId: number;
  apiCall: (bucketId: number, file: File) => Promise<FileDto>;
  setUploading: Dispatch<SetStateAction<File[]>>;
  setFile: (File: FileDto) => void;
};

export function useUploadingFile({ bucketId, apiCall, setUploading, setFile }: UseUploadingFileProps) {
  return useMutation({
    mutationFn: (file: File) => apiCall(bucketId, file),
    onMutate: (file) => {
      setUploading((files) => [...files, file]);
    },
    onSuccess: (file) => {
      setFile(file);
    },
    onSettled: (_, __, file) => {
      setUploading((files) => files.filter((f) => f !== file));
    },
    onError: async (error, file) => {
      toast.error(await buildError(`${texts.files.uploadFailed} '${file.name}'`, error));
    },
  });
}

type UseDeletingFileProps = {
  bucketId: number;
  apiCall: (bucketId: number, fileId: number) => Promise<void>;
  removeFile: (id: number) => void;
  setRowSelection: (value: SetStateAction<object>) => void;
};

export function useDeletingFile({ bucketId, apiCall, removeFile, setRowSelection }: UseDeletingFileProps) {
  return useMutation({
    mutationFn: (file: FileDto) => {
      return apiCall(bucketId, file.id);
    },
    onSuccess: (_, bucket) => {
      removeFile(bucket.id);
      setRowSelection({});
    },
    onError: async (error) => {
      toast.error(await buildError(texts.files.removeFileFailed, error));
    },
  });
}

type UseDeletingBucketProps = {
  apiCall: (id: number, initOverrides?: RequestInit | InitOverrideFunction) => Promise<void>;
  removeBucket: (id: number) => void;
  navigation: () => void;
};

export function useDeletingBucket({ apiCall, removeBucket, navigation }: UseDeletingBucketProps) {
  return useMutation({
    mutationFn: (bucket: BucketDto) => {
      return apiCall(bucket.id);
    },
    onSuccess: (_, bucket) => {
      removeBucket(bucket.id);
      navigation();
    },
    onError: async (error) => {
      toast.error(await buildError(texts.files.removeBucketFailed, error));
    },
  });
}
