import { Button } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useApi, UserGroupDto } from 'src/api';
import { Page } from 'src/components';
import { useEventCallback } from 'src/hooks';
import { formatBoolean } from 'src/lib';
import { texts } from 'src/texts';
import { CreateUserGroupDialog } from './CreateUserGroupDialog';
import { UpdateUserGroupDialog } from './UpdateUserGroupDialog';
import { useUserGroupsStore } from './state';

export function UserGroupsPage() {
  const api = useApi();

  const { removeUserGroup, setUserGroup, setUserGroups, userGroups } = useUserGroupsStore();

  const [toCreate, setToCreate] = useState<boolean>();
  const [toUpdate, setToUpdate] = useState<UserGroupDto | null>(null);

  const { data: loadedGroups, isFetched } = useQuery({
    queryKey: ['userGroups'],
    queryFn: () => api.users.getUserGroups(),
  });

  useEffect(() => {
    if (loadedGroups) {
      setUserGroups(loadedGroups.items);
    }
  }, [loadedGroups, setUserGroups]);

  const doClose = useEventCallback(() => {
    setToUpdate(null);
    setToCreate(false);
  });

  return (
    <Page>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl">{texts.userGroups.headline}</h1>

        <div className="flex gap-4">
          <Button leftSection={<IconPlus />} onClick={() => setToCreate(true)}>
            {texts.userGroups.create}
          </Button>
        </div>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <table className="table table-fixed text-base">
            <thead>
              <tr>
                <th>{texts.common.groupName}</th>
                <th className="w-40">{texts.common.administration}</th>
                <th className="w-40">{texts.common.builtIn}</th>
              </tr>
            </thead>
            <tbody>
              {userGroups.map((userGroup) => (
                <tr className="cursor-pointer hover:bg-gray-50" key={userGroup.id} onClick={() => setToUpdate(userGroup)}>
                  <td className="overflow-hidden font-semibold">{userGroup.name}</td>
                  <td className="overflow-hidden">{formatBoolean(userGroup.isAdmin)}</td>
                  <td className="overflow-hidden">{formatBoolean(userGroup.isBuiltIn)}</td>
                </tr>
              ))}

              {userGroups.length === 0 && isFetched && (
                <tr>
                  <td colSpan={3}>{texts.userGroups.empty}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toCreate && <CreateUserGroupDialog onClose={doClose} onCreate={setUserGroup} />}
      {toUpdate && (
        <UpdateUserGroupDialog onClose={doClose} onDelete={removeUserGroup} onUpdate={setUserGroup} target={toUpdate} />
      )}
    </Page>
  );
}
