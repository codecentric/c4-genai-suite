import { yupResolver } from '@hookform/resolvers/yup';
import { Button, Portal } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { IconClipboard } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import { instanceOfUserDto, UpsertUserDto, useApi, UserDto, UserGroupDto } from 'src/api';
import { ConfirmDialog, FormAlert, Forms, Modal } from 'src/components';
import { useDeleteUser } from 'src/pages/admin/users/hooks/useDeleteUser';
import { useUpsertUser } from 'src/pages/admin/users/hooks/useUpsertUser';
import { texts } from 'src/texts';
import { GenerateApiKeyButton } from './GenerateApiKeyButton';

const SCHEME = Yup.object({
  // Required name.
  name: Yup.string().label(texts.common.name).required(),

  // Required email.
  email: Yup.string().label(texts.common.email).required().email(),

  // Required user groups.
  userGroupIds: Yup.array(Yup.string()).label(texts.common.userGroups).required(),

  // The password to confirm.
  passwordConfirm: Yup.string()
    .label(texts.common.passwordConfirm)
    .oneOf([Yup.ref('password'), '', undefined], texts.common.passwordsDoNotMatch),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RESOLVER = yupResolver<any>(SCHEME);

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

export const UpdateUserDialog = (props: Omit<UpdateUserProps, 'type'>): JSX.Element =>
  UpsertUserDialog({ ...props, type: 'update' });
export const CreateUserDialog = (props: Omit<CreateUserProps, 'type'>): JSX.Element =>
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
  const form = useForm<UpsertUserDto>({ resolver: RESOLVER, defaultValues });
  form.watch(({ userGroupIds }) => setUserIsAdmin(containsAdminGroup(userGroupIds ?? [])));
  form.watch(({ apiKey }) => setHasApiKey(Boolean(apiKey) || (!isCreating && props.target.hasApiKey)));
  return (
    <Portal>
      <FormProvider {...form}>
        <form noValidate onSubmit={form.handleSubmit((newUserInformation) => userUpsert.mutate(newUserInformation))}>
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
                      onPerform={form.handleSubmit((newUserInformation) => {
                        const updatedUser = { ...newUserInformation, apiKey: null };
                        userUpsert.mutate(updatedUser);
                      })}
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
              <Forms.Text required name="name" label={texts.common.name} />
              <Forms.Text required name="email" label={texts.common.email} />
              <Forms.Select
                required
                multiple
                name="userGroupIds"
                options={userGroupsOptions ?? []}
                label={texts.common.userGroups}
              />
              <Forms.Password name="password" label={texts.common.password} />
              <Forms.Password name="passwordConfirm" label={texts.common.passwordConfirm} />
              <Forms.Row name="apiKey" label={texts.common.apiKey} hints={!userIsAdmin && texts.users.apiKeyHint}>
                <div className="flex items-center gap-2">
                  {form?.getValues('apiKey') && (
                    <div
                      className="btn btn-square"
                      onClick={() => {
                        const value = form.getValues('apiKey');
                        if (!value) return;
                        clipboard.copy(value);
                        toast(texts.common.copied, { type: 'info' });
                      }}
                    >
                      <IconClipboard />
                    </div>
                  )}
                  <div className="grow">
                    <Forms.Text vertical name="apiKey" disabled={true} />
                  </div>
                  <GenerateApiKeyButton disabled={!userIsAdmin} />
                </div>
              </Forms.Row>
              {!isCreating && userDelete && (
                <>
                  <hr className="my-6" />

                  <Forms.Row name="danger" label={texts.common.dangerZone}>
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
                  </Forms.Row>
                </>
              )}
            </fieldset>
          </Modal>
        </form>
      </FormProvider>
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
