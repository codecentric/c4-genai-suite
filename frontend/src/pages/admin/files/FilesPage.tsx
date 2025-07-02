import { Button, Checkbox } from '@mantine/core';
import { IconEdit, IconLoader, IconTrash, IconUpload } from '@tabler/icons-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ColumnDef,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { formatDate } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { BucketDto, BucketDtoTypeEnum, FileDto, useApi } from 'src/api';
import { ConfirmDialog, FilterableTable, Pagingation } from 'src/components';
import { useEventCallback, useTransientNavigate } from 'src/hooks';
import { buildError, formatFileSize } from 'src/lib';
import { extractType } from 'src/pages/utils';
import { texts } from 'src/texts';
import { UpsertBucketDialog } from './UpsertBucketDialog';
import { useBucketstore, useFilesStore } from './state';
declare module '@tanstack/react-table' {
  //allows us to define custom properties for our columns
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    filterVariant?: 'text' | 'range' | 'select';
  }
}

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

  //Tanstack Table
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState({});

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
      setRowSelection({});
    },
    onError: async (error) => {
      toast.error(await buildError(texts.files.removeFileFailed, error));
    },
  });

  const handleMultiRowDelete = () => {
    const originalFiles = table.getSelectedRowModel().rows.map((row) => row.original);
    originalFiles.forEach((file) => deleting.mutate(file));
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (files) => files.forEach((file) => upload.mutate(file)),
    noClick: true,
  });

  const columns = useMemo<ColumnDef<FileDto, unknown>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            radius="sm"
            color="blue"
            {...{
              checked: table.getIsAllRowsSelected(),
              indeterminate: table.getIsSomeRowsSelected(),
              onChange: table.getToggleAllRowsSelectedHandler(),
            }}
          />
        ),
        cell: ({ row }) => (
          <div className="px-0">
            <Checkbox
              radius="sm"
              color="blue"
              {...{
                checked: row.getIsSelected(),
                disabled: !row.getCanSelect(),
                indeterminate: row.getIsSomeSelected(),
                onChange: row.getToggleSelectedHandler(),
              }}
            />
          </div>
        ),
      },
      {
        accessorKey: 'fileName',
        cell: (info) => info.getValue(),
        header: () => <span>{texts.files.properties.fileName}</span>,
      },
      {
        accessorKey: 'mimeType',
        cell: (info) => <span className="badge self-center bg-gray-100">{extractType(info.row.original)}</span>,
        header: () => <span>{texts.files.properties.fileType}</span>,
      },
      {
        id: 'fileSize',
        accessorFn: (row) => row.fileSize,
        cell: (info) => formatFileSize(Number(info.getValue())),
        header: () => <span>{texts.files.properties.fileSize}</span>,
      },
      {
        id: 'uploadedAt',
        accessorFn: (row) => row.uploadedAt,
        cell: (info) => formatDate(String(info.getValue()), 'Pp'),
        header: () => <span>{texts.files.properties.uploadedAt}</span>,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: files,
    columns: columns,
    state: {
      rowSelection: rowSelection,
      globalFilter: globalFilter,
    },
    globalFilterFn: 'includesString',
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(), //client-side filtering
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(), // client-side faceting
    getFacetedUniqueValues: getFacetedUniqueValues(), // generate unique values for select filter/autocomplete
    getFacetedMinMaxValues: getFacetedMinMaxValues(), // generate min/max values for range filter,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    columnResizeDirection: 'ltr',
    columnResizeMode: 'onChange',
  });

  return (
    <>
      {thisBucket && (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-8">
            <div className="flex items-end justify-between">
              <h2 className="text-3xl">{thisBucket.name}</h2>
              <div className="flex gap-2">
                <Button leftSection={<IconEdit size={20} />} onClick={() => setToUpdate(true)}>
                  {texts.common.edit}
                </Button>
                <ConfirmDialog
                  title={texts.files.removeBucketConfirmTitle}
                  text={texts.files.removeBucketConfirmText}
                  onPerform={() => deletingBucket.mutate(thisBucket)}
                >
                  {({ onClick }) => (
                    <Button variant="light" onClick={onClick} color="red" leftSection={<IconTrash size={20} />}>
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
                {thisBucket.type !== BucketDtoTypeEnum.User && (
                  <Button onClick={open} disabled={isDragActive || uploading.length > 0} color="black">
                    {uploading.length > 0 ? <IconLoader size={20} className="animate-spin" /> : <IconUpload size={20} />}
                  </Button>
                )}
              </div>
            )}
          </div>

          {thisBucket.type !== BucketDtoTypeEnum.Conversation && (
            <div className="relative flex w-full flex-col overflow-x-scroll rounded-xl bg-white bg-clip-border p-2 shadow-sm">
              {thisBucket?.type !== BucketDtoTypeEnum.User ? (
                <div className={isDragActive ? 'rounded-sm bg-gray-50' : ''} {...getRootProps()}>
                  <input {...getInputProps()} />
                  <FilterableTable table={table} globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} />
                </div>
              ) : (
                <FilterableTable table={table} globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} />
              )}
              <div className="flex flex-row items-center justify-between gap-x-2 border-t border-gray-300 p-2 text-sm">
                <div className="text-gray-500">{`${table.getSelectedRowModel().rows.length} Rows Selected`}</div>
                <ConfirmDialog
                  title={texts.files.removeFilesConfirmTitle}
                  text={texts.files.removeFilesConfirmText(table.getSelectedRowModel().rows.length)}
                  onPerform={() => handleMultiRowDelete()}
                >
                  {({ onClick }) => (
                    <Button
                      variant="light"
                      color="red"
                      onClick={onClick}
                      size="xs"
                      disabled={table.getSelectedRowModel().rows.length == 0 ? true : false}
                    >
                      {texts.common.remove}
                    </Button>
                  )}
                </ConfirmDialog>
              </div>
            </div>
          )}
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
