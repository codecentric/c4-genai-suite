import { UserEntity, UserGroupEntity } from 'src/domain/database';
import { User, UserGroup } from '../interfaces';

export function buildUser(source: UserEntity): User {
  const { apiKey, passwordHash, ...other } = source;
  return {
    ...other,
    hasPassword: !!passwordHash,
    hasApiKey: !!apiKey,
  };
}

export function buildUserGroup(source: UserGroupEntity): UserGroup {
  return source;
}

export function buildUserSnapshot(user: User): Record<string, unknown> {
  return JSON.parse(JSON.stringify(user)) as Record<string, unknown>;
}

export function buildUserGroupSnapshot(userGroup: UserGroup): Record<string, unknown> {
  return JSON.parse(JSON.stringify(userGroup)) as Record<string, unknown>;
}
