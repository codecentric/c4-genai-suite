import { Button, NumberInput, Portal, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { z } from 'zod';
import { UpsertUserGroupDto, useApi, UserGroupDto } from 'src/api';
import { FormAlert, Modal } from 'src/components';
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
    validate: zod4Resolver(SCHEME),
    initialValues: { name: '', monthlyUserTokens: null, monthlyTokens: null },
    mode: 'uncontrolled',
  });

  return (
    <Portal>
      <form
        noValidate
        onSubmit={form.onSubmit((v) =>
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
          </fieldset>
        </Modal>
      </form>
    </Portal>
  );
}
