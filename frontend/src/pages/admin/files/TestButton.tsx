import { Button, Tooltip } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { UpsertBucketDto, useApi } from 'src/api';
import { buildError } from 'src/lib';
import { texts } from 'src/texts';

export function TestButton({ form }: { form: UseFormReturnType<UpsertBucketDto> }) {
  const api = useApi();

  const testing = useMutation({
    mutationFn: () => {
      const values = form.getValues();

      return api.files.testBucket(values);
    },
    onSuccess: () => {
      toast.success(texts.files.testSuccess);
    },
    onError: async (error) => {
      toast.error(await buildError(texts.files.testFailed, error));
    },
  });

  const isDisabled = !form.isValid() || testing.isPending;

  return (
    <Tooltip label={texts.files.testTooltip}>
      <Button type="button" variant="outline" disabled={isDisabled} onClick={() => testing.mutate()} loading={testing.isPending}>
        {texts.extensions.test}
      </Button>
    </Tooltip>
  );
}
