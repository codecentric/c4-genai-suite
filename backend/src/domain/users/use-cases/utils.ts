import { UserEntity, UserGroupEntity } from 'src/domain/database';
import { User, UserGroup } from '../interfaces';

export function buildUser(source: UserEntity): User {
  const { apiKey, passwordHash, userGroups, ...other } = source;
  return {
    ...other,
    userGroupIds: userGroups ? userGroups.map((g) => g.id) : [],
    hasPassword: !!passwordHash,
    hasApiKey: !!apiKey,
  };
}

export function buildUserGroup(source: UserGroupEntity): UserGroup {
  return source;
}
