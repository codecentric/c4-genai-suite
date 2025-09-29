import { Button, Portal } from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { useMemo, useState } from 'react';
import z from 'zod';
import { UpsertUserDto, useApi, UserDto, UserGroupDto } from 'src/api';
import { ConfirmDialog, FormAlert, Forms, Modal } from 'src/components';
import { UserGroupTagsInput } from 'src/components/UserGroupTagsInput';
import { useDeleteUser } from 'src/pages/admin/users/hooks/useDeleteUser';
import { useUpsertUser } from 'src/pages/admin/users/hooks/useUpsertUser';
import { texts } from 'src/texts';
import { GenerateApiKeyButton } from './GenerateApiKeyButton';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email().min(1),
  userGroupIds: z.array(z.string()),
  passwordConfirm: z.string().min(1),
});

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

  const api = useApi();

  const defaultValues = isCreating
    ? {
        userGroupIds: userGroups.filter((userGroup) => userGroup.id === 'default').map((userGroup) => userGroup.id),
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

  const form = useForm<UpsertUserDto>({
    mode: 'controlled',
    initialValues: defaultValues,
    validate: zodResolver(schema),
  });
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  form.watch('userGroupIds', ({ value }) => {
    setUserIsAdmin(value?.includes('admin') ?? false);
  });
  const [hasApiKey, setHasApiKey] = useState(false);
  form.watch('apiKey', ({ value }) => {
    setHasApiKey(Boolean(value) || (!isCreating && props.target.hasApiKey));
  });
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
                    onPerform={form.onSubmit((newUserInformation) => {
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
              data-testid="userGroupId1"
              name="userGroupId"
              options={userGroupsOptions}
              label={texts.common.userGroup}
            />
            <UserGroupTagsInput form={form} />

            <Forms.Password name="password" label={texts.common.password} />

            <Forms.Password name="passwordConfirm" label={texts.common.passwordConfirm} />

            <Forms.Row name="apiKey" label={texts.common.apiKey} hints={!userIsAdmin && texts.users.apiKeyHint}>
              <div className="flex gap-2">
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
