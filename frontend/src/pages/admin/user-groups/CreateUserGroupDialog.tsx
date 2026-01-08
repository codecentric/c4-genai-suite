import { yupResolver } from '@hookform/resolvers/yup';
import { Button, Portal } from '@mantine/core';
import { useMutation } from '@tanstack/react-query';
import { FormProvider, useForm } from 'react-hook-form';
import * as Yup from 'yup';
import { UpsertUserGroupDto, useApi, UserGroupDto } from 'src/api';
import { FormAlert, Forms, Modal } from 'src/components';
import { texts } from 'src/texts';

const SCHEME = Yup.object({
  name: Yup.string().label(texts.common.name).required(),
  monthlyUserTokens: Yup.number()
    .positive()
    .label(texts.common.monthlyUserTokens)
    .nullable()
    .transform((value: number, originalValue: string) => (originalValue === '' ? null : value)),
});
type SchemaType = Yup.InferType<typeof SCHEME>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RESOLVER = yupResolver<any>(SCHEME);

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
    defaultValues: { name: '', monthlyUserTokens: null },
  });

  return (
    <Portal>
      <FormProvider {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit((v) =>
            updating.mutate({
              name: v.name,
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

              <Forms.Number name="monthlyUserTokens" label={texts.common.monthlyUserTokens} refreshable />
            </fieldset>
          </Modal>
        </form>
      </FormProvider>
    </Portal>
  );
}
