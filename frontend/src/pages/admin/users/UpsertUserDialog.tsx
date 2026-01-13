import { Button, MultiSelect, PasswordInput, Portal, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useClipboard } from '@mantine/hooks';
import { IconClipboard } from '@tabler/icons-react';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { instanceOfUserDto, UpsertUserDto, useApi, UserDto, UserGroupDto } from 'src/api';
import { ConfirmDialog, FormAlert, Modal } from 'src/components';
import { useDeleteUser } from 'src/pages/admin/users/hooks/useDeleteUser';
import { useUpsertUser } from 'src/pages/admin/users/hooks/useUpsertUser';
import { texts } from 'src/texts';
import { GenerateApiKeyButton } from './GenerateApiKeyButton';

const SCHEME = z
  .object({
    // Required name.
    name: z.string().min(1, texts.common.name),

    // Required email.
    email: z.string().min(1, texts.common.email).email(),

    // Required user groups.
    userGroupIds: z.array(z.string()).min(1, texts.common.userGroups),

    // Optional password fields
    password: z.string().optional(),
    passwordConfirm: z.string().optional(),

    // Optional apiKey
    apiKey: z.string().optional().nullable(),

    // Optional hasApiKey
    hasApiKey: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.password || data.passwordConfirm) {
        return data.password === data.passwordConfirm;
      }
      return true;
    },
    {
      message: texts.common.passwordsDoNotMatch,
      path: ['passwordConfirm'],
    },
  );

type BaseUserProps = {
  type: 'update' | 'create';
  userGroups: UserGroupDto[];
  onClose: () => void;
};

export type UpdateUserProps = {
  type: 'update';
  target: UserDto;
  onUpdate: (user: UserDto) => void;
  onDelete: (id: string) => void;
} & BaseUserProps;

export type CreateUserProps = {
  type: 'create';
  onCreate: (user: UserDto) => void;
} & BaseUserProps;

type UpsertUserDialogProps = UpdateUserProps | CreateUserProps;

export const UpdateUserDialog = (props: Omit<UpdateUserProps, 'type'>): React.ReactElement =>
  UpsertUserDialog({ ...props, type: 'update' });
export const CreateUserDialog = (props: Omit<CreateUserProps, 'type'>): React.ReactElement =>
  UpsertUserDialog({ ...props, type: 'create' });

function UpsertUserDialog(props: UpsertUserDialogProps) {
  const isCreating = props.type === 'create';
  const { onClose, userGroups } = props;
  const clipboard = useClipboard();
  const api = useApi();

  const defaultValues = isCreating
    ? {
        userGroupIds: ['default'],
        name: '',
        email: '',
      }
    : props.target;

  const userUpsert = useUpsertUser(api, isCreating ? null : props.target, isCreating ? props.onCreate : props.onUpdate, onClose);
  const userDelete = useDeleteUser(api, isCreating ? null : props.target, isCreating ? null : props.onDelete, onClose);

  const isPending = userUpsert.isPending || userDelete?.isPending;

  const userGroupsOptions = useMemo(() => {
    const sorted = sortForDefaultUserGroup(userGroups);
    return sorted.map((g) => ({ label: g.name, value: g.id }));
  }, [userGroups]);

  const containsAdminGroup = (userGroupIds: (string | undefined)[]) => userGroupIds?.includes('admin') ?? false;
  const [userIsAdmin, setUserIsAdmin] = useState(
    !isCreating && instanceOfUserDto(props.target) && containsAdminGroup(props.target['userGroupIds'] ?? []),
  );
  const [hasApiKey, setHasApiKey] = useState(false);

  const form = useForm<UpsertUserDto>({
    validate: zod4Resolver(SCHEME) as unknown as (values: UpsertUserDto) => Record<string, string | null>,
    initialValues: defaultValues as UpsertUserDto,
    mode: 'uncontrolled',
  });

  // Watch for changes to update state
  const userGroupIds = form.getValues().userGroupIds;
  const apiKey = form.getValues().apiKey;

  useEffect(() => {
    setUserIsAdmin(containsAdminGroup(userGroupIds ?? []));
    setHasApiKey(Boolean(apiKey) || (!isCreating && 'target' in props && props.target.hasApiKey));
  }, [userGroupIds, apiKey, isCreating, props]);

  return (
    <Portal>
      <form noValidate onSubmit={form.onSubmit((newUserInformation) => userUpsert.mutate(newUserInformation))}>
        <Modal
          onClose={onClose}
          header={<div className="flex items-center gap-4">{isCreating ? texts.users.create : texts.users.update}</div>}
          footer={
            <fieldset disabled={isPending}>
              <div className="flex flex-row justify-end gap-4">
                <Button type="button" variant="subtle" onClick={onClose}>
                  {texts.common.cancel}
                </Button>

                {!userIsAdmin && hasApiKey ? (
                  <ConfirmDialog
                    title={texts.users.update}
                    text={texts.users.warningNotAdminWithKey}
                    onPerform={() => {
                      const values = form.getValues();
                      const updatedUser = { ...values, apiKey: null };
                      userUpsert.mutate(updatedUser);
                    }}
                  >
                    {({ onClick }) => (
                      <button type="button" className="btn" onClick={onClick}>
                        {texts.common.save}
                      </button>
                    )}
                  </ConfirmDialog>
                ) : (
                  <Button type="submit">{texts.common.save}</Button>
                )}
              </div>
            </fieldset>
          }
        >
          <fieldset disabled={isPending}>
            <FormAlert common={texts.users.updateFailed} error={userUpsert.error} />

            <TextInput
              withAsterisk
              label={texts.common.name}
              className="mb-4"
              key={form.key('name')}
              {...form.getInputProps('name')}
            />

            <TextInput
              withAsterisk
              label={texts.common.email}
              className="mb-4"
              key={form.key('email')}
              {...form.getInputProps('email')}
            />

            <MultiSelect
              withAsterisk
              label={texts.common.userGroups}
              data={userGroupsOptions ?? []}
              className="mb-4"
              key={form.key('userGroupIds')}
              {...form.getInputProps('userGroupIds')}
            />

            <PasswordInput
              label={texts.common.password}
              className="mb-4"
              key={form.key('password')}
              {...form.getInputProps('password')}
            />

            <PasswordInput
              label={texts.common.passwordConfirm}
              className="mb-4"
              key={form.key('passwordConfirm')}
              {...form.getInputProps('passwordConfirm')}
            />

            <div className="mb-4">
              {!userIsAdmin && <div className="text-sm text-slate-500">{texts.users.apiKeyHint}</div>}
              <div className="flex items-center gap-2">
                {form.getValues().apiKey && (
                  <div
                    className="btn btn-square"
                    onClick={() => {
                      const value = form.getValues().apiKey;
                      if (!value) return;
                      clipboard.copy(value);
                      toast(texts.common.copied, { type: 'info' });
                    }}
                  >
                    <IconClipboard />
                  </div>
                )}
                <div className="grow">
                  <TextInput
                    label={texts.common.apiKey}
                    disabled={true}
                    key={form.key('apiKey')}
                    {...form.getInputProps('apiKey')}
                  />
                </div>
                <GenerateApiKeyButton disabled={!userIsAdmin} form={form} />
              </div>
            </div>

            {!isCreating && userDelete && (
              <>
                <hr className="my-6" />

                <div className="flex flex-row">
                  <label className="mt-3 w-48 shrink-0 text-sm font-semibold">{texts.common.dangerZone}</label>
                  <ConfirmDialog
                    title={texts.users.removeConfirmTitle}
                    text={texts.users.removeConfirmText}
                    onPerform={() => userDelete.mutate(props.target.id)}
                  >
                    {({ onClick }) => (
                      <button type="button" className="btn btn-error" onClick={onClick}>
                        {texts.common.remove}
                      </button>
                    )}
                  </ConfirmDialog>
                </div>
              </>
            )}
          </fieldset>
        </Modal>
      </form>
    </Portal>
  );
}

function sortForDefaultUserGroup(userGroups: UserGroupDto[]) {
  return userGroups.toSorted((a, b) => {
    if (a.isBuiltIn && !a.isAdmin) {
      return -1;
    }
    if (b.isBuiltIn && !b.isAdmin) {
      return 1;
    }
    return a.name.localeCompare(b.name);
  });
}
