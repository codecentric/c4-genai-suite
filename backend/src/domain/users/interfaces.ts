export interface User {
  // The user ID from the auth provider.
  id: string;

  // The display name.
  name: string;

  // The email address.
  email: string;

  // The URL to an external picture.
  picture?: string;

  // The user group IDs.
  userGroupIds: string[];

  // Indicates if the user has a password configured.
  hasPassword?: boolean;

  // Indicates if the user has an api configured.
  hasApiKey?: boolean;

  // The API Key.
  apiKey?: string;
}

export interface UserGroup {
  // The ID of the user group.
  id: string;

  // The display name.
  name: string;

  // Indicates if the users are admins.
  isAdmin: boolean;

  // Indicates if the user group is builtin and cannot be deleted.
  isBuiltIn: boolean;

  // The monthly allowed tokens for all users in the group.
  monthlyTokens?: number;

  // The monthly allowed tokens per user in the group.
  monthlyUserTokens?: number;
}
