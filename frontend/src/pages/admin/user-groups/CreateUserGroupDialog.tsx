import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Portal } from '@mantine/core';
import { useMutation } from '@tanstack/react-query';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';
import { UpsertUserGroupDto, useApi, UserGroupDto } from 'src/api';
import { FormAlert, Forms, Modal } from 'src/components';
import { texts } from 'src/texts';

const SCHEME = z.object({
  name: z.string().min(1, texts.common.name),
  monthlyTokens: z.number().positive().nullable()
    .or(z.literal('').transform(() => null)),
  monthlyUserTokens: z.number().positive().nullable()
    .or(z.literal('').transform(() => null)),
});
type SchemaType = z.infer<typeof SCHEME>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RESOLVER = zodResolver(SCHEME) as any;

export interface CreateUserGroupDialogProps {
  onClose: () => void;
  onCreate: (user: UserGroupDto) => void;
}

export function CreateUserGroupDialog({ onClose, onCreate }: CreateUserGroupDialogProps) {
  const api = useApi();

  const updating = useMutation({
    mutationFn: (request: UpsertUserGroupDto) => {
      return api.users.postUserGroup(request);
    },
    onSuccess: (response) => {
      onCreate(response);
      onClose();
    },
  });

  const form = useForm<SchemaType>({
    resolver: RESOLVER,
    defaultValues: { name: '', monthlyUserTokens: null, monthlyTokens: null },
  });

  return (
    <Portal>
      <FormProvider {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit((v) =>
            updating.mutate({
              name: v.name,
              monthlyTokens: v.monthlyTokens ? v.monthlyTokens : undefined,
              monthlyUserTokens: v.monthlyUserTokens ? v.monthlyUserTokens : undefined,
            }),
          )}
        >
          <Modal
            onClose={onClose}
            header={<div className="flex items-center gap-4">{texts.userGroups.create}</div>}
            footer={
              <fieldset disabled={updating.isPending}>
                <div className="flex flex-row justify-end gap-4">
                  <Button type="button" variant="subtle" onClick={onClose}>
                    {texts.common.cancel}
                  </Button>

                  <Button type="submit">{texts.common.save}</Button>
                </div>
              </fieldset>
            }
          >
            <fieldset disabled={updating.isPending}>
              <FormAlert common={texts.userGroups.updateFailed} error={updating.error} />

              <Forms.Text required name="name" label={texts.common.groupName} />

              <Forms.Number name="monthlyTokens" label={texts.common.monthlyTokens} refreshable />

              <Forms.Number name="monthlyUserTokens" label={texts.common.monthlyUserTokens} refreshable />
            </fieldset>
          </Modal>
        </form>
      </FormProvider>
    </Portal>
  );
}
