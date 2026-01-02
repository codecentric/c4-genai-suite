export interface AuthUser {
  id: string;
}

export interface AuthConfig {
  baseUrl: string;
  trustProxy: boolean;

  github?: {
    clientId: string;
    clientSecret: string;
  };
  google?: {
    clientId: string;
    clientSecret: string;
  };
  microsoft?: {
    clientId: string;
    clientSecret: string;
    tenant?: string;
  };
  oauth?: {
    authorizationURL: string;
    brandName?: string;
    brandColor?: string;
    clientId: string;
    clientSecret: string;
    tokenURL: string;
    userInfoURL: string;
  };
  enablePassword?: boolean;
  userGroupsPropertyName: string;
  acceptUserGroupsFromAuthProvider?: boolean;
}
