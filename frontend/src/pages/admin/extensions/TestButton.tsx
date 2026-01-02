import { Button } from '@mantine/core';
import { useMutation } from '@tanstack/react-query';
import { useFormContext } from 'react-hook-form';
import { toast } from 'react-toastify';
import { CreateExtensionDto, useApi } from 'src/api';
import { buildError } from 'src/lib';
import { texts } from 'src/texts';

type TestButtonProps = { extensionId?: number };

export function TestButton(props: TestButtonProps) {
  const { extensionId } = props;
  const api = useApi();

  const form = useFormContext<CreateExtensionDto>();
  const testing = useMutation({
    mutationFn: (values: CreateExtensionDto) => {
      return api.extensions.testExtension({ ...values, id: extensionId });
    },
    onSuccess: () => {
      toast.success(texts.extensions.testSuccess);
    },
    onError: async (error) => {
      toast.error(await buildError(texts.extensions.testFailed, error));
    },
  });

  // The test button is testable if the form is valid or if the form was not changed
  // (in which case validation did not run, but it probably is valid)
  const isTestable = form.formState.isValid || !form.formState.isDirty;
  // Disable if form can not be tested or is currently testing
  const isDisabled = !isTestable || testing.isPending;

  return (
    <Button
      type="button"
      variant="outline"
      data-tooltip-id="default"
      data-tooltip-content={texts.extensions.testTooltip}
      disabled={isDisabled}
      onClick={form.handleSubmit((v) => testing.mutate(v))}
      loading={testing.isPending}
    >
      {texts.extensions.test}
    </Button>
  );
}
