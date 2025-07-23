import { Button } from '@mantine/core';
import { memo } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { ChatUICallbackResultDto, type ExtensionArgumentObjectSpecDto, StreamUIRequestDto } from 'src/api';
import { Markdown } from 'src/components';
import { Argument } from 'src/pages/admin/extensions/ExtensionForm';
import { useArgumentObjectSpecResolver } from 'src/pages/admin/extensions/hooks';
import { texts } from 'src/texts';
import { useConfirmAiAction } from '../../state/chat';

type DynamicFormProps = { schema: ExtensionArgumentObjectSpecDto };

function DynamicForm(props: DynamicFormProps) {
  const { schema } = props;

  return (
    <>
      {schema.type === 'object' && Object.keys(schema.properties).length > 0 && (
        <div className="flex flex-col">
          {Object.entries(schema.properties).map(([name, spec]) => (
            <Argument vertical key={name} buckets={[]} name={name} argument={spec} />
          ))}
        </div>
      )}
    </>
  );
}

export const ChatItemUserInput = memo(({ request }: { request: StreamUIRequestDto }) => {
  const confirmAiAction = useConfirmAiAction(request.id);
  const form = useForm<object>({
    resolver: useArgumentObjectSpecResolver(request.schema),
  });

  const onSubmit = (data: ChatUICallbackResultDto['data']) => {
    confirmAiAction.mutate({ action: 'accept', data });
  };

  if (confirmAiAction.isSuccess) {
    return null;
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="my-1 flex flex-col gap-2 rounded border-[1px] border-gray-200 p-3">
          <div>
            <Markdown>{request.text}</Markdown>
          </div>
          <DynamicForm schema={request.schema} />
          <fieldset>
            <div className="flex flex-row justify-between">
              <div></div>
              <div className="flex gap-2">
                <Button type="button" variant="subtle" onClick={() => confirmAiAction.mutate({ action: 'reject' })}>
                  {texts.common.reject}
                </Button>
                <Button type="submit">{texts.common.confirm}</Button>
              </div>
            </div>
          </fieldset>
        </div>
      </form>
    </FormProvider>
  );
});
