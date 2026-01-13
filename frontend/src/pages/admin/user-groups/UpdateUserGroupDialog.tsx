import { Button, Divider, NumberInput, Portal, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconTrash } from '@tabler/icons-react';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { useEffect } from 'react';
import { z } from 'zod';
import { useApi, UserGroupDto } from 'src/api';
import { ConfirmDialog, FormAlert, Modal } from 'src/components';
import { useDeleteUserGroup } from 'src/pages/admin/user-groups/hooks/useDeleteUserGroup';
import { useUpdateUserGroup } from 'src/pages/admin/user-groups/hooks/useUpdateUserGroup';
import { texts } from 'src/texts';

const SCHEME = z.object({
  name: z.string().min(1, texts.common.name),
  monthlyTokens: z
    .number()
    .positive()
    .nullable()
    .or(z.literal('').transform(() => null)),
  monthlyUserTokens: z
    .number()
    .positive()
    .nullable()
    .or(z.literal('').transform(() => null)),
});

type SchemaType = z.infer<typeof SCHEME>;

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
    validate: zod4Resolver(SCHEME) as (values: SchemaType) => Record<string, string | null>,
    initialValues: { name: '', monthlyUserTokens: null, monthlyTokens: null },
    mode: 'uncontrolled',
  });
  useEffect(() => {
    form.setValues(target as SchemaType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return (
    <Portal>
      <form
        noValidate
        onSubmit={form.onSubmit((v) =>
          userGroupUpdate.mutate({
            name: v.name,
            monthlyTokens: v.monthlyTokens ? v.monthlyTokens : undefined,
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

            <TextInput
              withAsterisk
              label={texts.common.groupName}
              className="mb-4"
              key={form.key('name')}
              {...form.getInputProps('name')}
            />

            <NumberInput
              label={texts.common.monthlyTokens}
              className="mb-4"
              key={form.key('monthlyTokens')}
              {...form.getInputProps('monthlyTokens')}
            />

            <NumberInput
              label={texts.common.monthlyUserTokens}
              className="mb-4"
              key={form.key('monthlyUserTokens')}
              {...form.getInputProps('monthlyUserTokens')}
            />

            <Divider my="xs" label={texts.common.dangerZone} labelPosition="left" />

            <div className="flex flex-row">
              <label className="mt-3 w-48 shrink-0 text-sm font-semibold">{texts.common.remove}</label>
              <ConfirmDialog
                title={texts.userGroups.removeConfirmTitle}
                text={texts.userGroups.removeConfirmText}
                onPerform={userGroupDelete.mutate}
              >
                {({ onClick }) => (
                  <Button type="button" variant="light" color="red" leftSection={<IconTrash className="w-4" />} onClick={onClick}>
                    {texts.common.remove}
                  </Button>
                )}
              </ConfirmDialog>
            </div>
          </fieldset>
        </Modal>
      </form>
    </Portal>
  );
}
