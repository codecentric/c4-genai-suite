import { Button } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useApi, UserDto, UserGroupDto } from 'src/api';
import { Page, Pagingation, Search } from 'src/components';
import { useEventCallback } from 'src/hooks';
import { formatBoolean } from 'src/lib';
import { texts } from 'src/texts';
import { CreateUserDialog, UpdateUserDialog } from './UpsertUserDialog';
import { useUsersStore } from './state';

const EMPTY_USER_GROUPS: UserGroupDto[] = [];

export function UsersPage() {
  const api = useApi();

  const { removeUser, setUser, setUsers, users } = useUsersStore();

  const [page, setPage] = useState(0);
  const [query, setQuery] = useState<string>();
  const [toCreate, setToCreate] = useState<boolean>();
  const [toUpdate, setToUpdate] = useState<UserDto | null>(null);

  const { data: loadedUsers, isFetched } = useQuery({
    queryKey: ['users', page, query],
    queryFn: () => api.users.getUsers(page, 20, query),
  });

  const { data: loadedGroups } = useQuery({
    queryKey: ['userGroups'],
    queryFn: async () => await api.users.getUserGroups(),
  });

  useEffect(() => {
    if (loadedUsers) {
      setUsers(loadedUsers.items);
    }
  }, [loadedUsers, setUsers]);

  useEffect(() => {
    setPage(0);
  }, [query]);

  const doChangePage = useEventCallback((page: number) => {
    setPage(page);
  });

  const doClose = useEventCallback(() => {
    setToUpdate(null);
    setToCreate(false);
  });

  const userGroups = loadedGroups?.items || EMPTY_USER_GROUPS;

  return (
    <>
      <Page>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-3xl">{texts.users.headline}</h2>

          <div className="flex gap-4">
            <Search value={query} onSearch={setQuery} />

            <Button leftSection={<IconPlus />} onClick={() => setToCreate(true)}>
              {texts.users.create}
            </Button>
          </div>
        </div>

        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <table className="table table-fixed text-base">
              <thead>
                <tr>
                  <th>{texts.common.name}</th>
                  <th>{texts.common.email}</th>
                  <th>{texts.common.userGroup}</th>
                  <th className="w-24">{texts.common.apiKey}</th>
                  <th className="w-24">{texts.common.password}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr className="cursor-pointer hover:bg-gray-50" key={user.id} onClick={() => setToUpdate(user)}>
                    <td className="overflow-hidden font-semibold">{user.name}</td>
                    <td className="truncate overflow-hidden">{user.email}</td>
                    <td className="overflow-hidden">{userGroups.find((x) => x.id === user.userGroupId)?.name}</td>
                    <td className="overflow-hidden">{formatBoolean(user.hasApiKey)}</td>
                    <td className="overflow-hidden">{formatBoolean(user.hasPassword)}</td>
                  </tr>
                ))}

                {users.length === 0 && isFetched && (
                  <tr>
                    <td colSpan={4}>{texts.users.empty}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <Pagingation page={page} pageSize={20} total={loadedUsers?.total || 0} onPage={doChangePage} />
          </div>
        </div>
      </Page>
      {toCreate && <CreateUserDialog userGroups={userGroups} onClose={doClose} onCreate={setUser} />}
      {toUpdate && (
        <UpdateUserDialog onClose={doClose} onDelete={removeUser} onUpdate={setUser} target={toUpdate} userGroups={userGroups} />
      )}
    </>
  );
}
