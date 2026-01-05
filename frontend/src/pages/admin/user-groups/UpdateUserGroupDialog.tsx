import { yupResolver } from '@hookform/resolvers/yup';
import { Button, Divider, Portal } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import * as Yup from 'yup';
import { useApi, UserGroupDto } from 'src/api';
import { ConfirmDialog, FormAlert, Forms, Modal } from 'src/components';
import { useDeleteUserGroup } from 'src/pages/admin/user-groups/hooks/useDeleteUserGroup';
import { useUpdateUserGroup } from 'src/pages/admin/user-groups/hooks/useUpdateUserGroup';
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

export interface UpdateUserGroupDialogProps {
  target: UserGroupDto;
  onClose: () => void;
  onUpdate: (userGroup: UserGroupDto) => void;
  onDelete: (id: string) => void;
}

export function UpdateUserGroupDialog({ onClose, onDelete, onUpdate, target }: UpdateUserGroupDialogProps) {
  const api = useApi();

  const userGroupUpdate = useUpdateUserGroup(api, target, onUpdate, onClose);

  const userGroupDelete = useDeleteUserGroup(api, target, onDelete, onClose);

  const form = useForm<SchemaType>({
    resolver: RESOLVER,
    defaultValues: { name: '', monthlyUserTokens: null },
  });
  useEffect(() => {
    form.reset(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return (
    <Portal>
      <FormProvider {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit((v) =>
            userGroupUpdate.mutate({
              name: v.name,
              monthlyUserTokens: v.monthlyUserTokens ? v.monthlyUserTokens : undefined,
            }),
          )}
        >
          <Modal
            size="lg"
            onClose={onClose}
            header={<div className="flex items-center gap-4">{texts.userGroups.update}</div>}
            footer={
              <fieldset disabled={userGroupUpdate.isPending || userGroupDelete.isPending || target.isBuiltIn}>
                <div className="flex flex-row justify-end gap-4">
                  <Button variant="subtle" type="button" onClick={onClose}>
                    {texts.common.cancel}
                  </Button>

                  <Button type="submit">{texts.common.save}</Button>
                </div>
              </fieldset>
            }
          >
            <fieldset disabled={userGroupUpdate.isPending || userGroupDelete.isPending || target.isBuiltIn}>
              <FormAlert common={texts.userGroups.updateFailed} error={userGroupUpdate.error} />

              <Forms.Text required name="name" label={texts.common.groupName} />

              <Forms.Number name="monthlyUserTokens" label={texts.common.monthlyUserTokens} refreshable />

              <Divider my="xs" label={texts.common.dangerZone} labelPosition="left" />

              <Forms.Row name="danger" label={texts.common.remove}>
                <ConfirmDialog
                  title={texts.userGroups.removeConfirmTitle}
                  text={texts.userGroups.removeConfirmText}
                  onPerform={userGroupDelete.mutate}
                >
                  {({ onClick }) => (
                    <Button
                      type="button"
                      variant="light"
                      color="red"
                      leftSection={<IconTrash className="w-4" />}
                      onClick={onClick}
                    >
                      {texts.common.remove}
                    </Button>
                  )}
                </ConfirmDialog>
              </Forms.Row>
            </fieldset>
          </Modal>
        </form>
      </FormProvider>
    </Portal>
  );
}
