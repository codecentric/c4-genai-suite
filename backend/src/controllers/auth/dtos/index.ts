import { ApiProperty } from '@nestjs/swagger';
import { AuthConfig } from 'src/domain/auth/interfaces';
import { BUILTIN_USER_GROUP_ADMIN } from 'src/domain/database';
import { User } from 'src/domain/users';

export class AuthProviderDto {
  @ApiProperty({
    description: 'The unique name.',
    required: true,
  })
  name!: string;

  @ApiProperty({
    description: 'The display name.',
    required: true,
  })
  displayName!: string;

  @ApiProperty({
    description: 'The color.',
    required: true,
  })
  color!: string;
}

export class AuthSettingsDto {
  @ApiProperty({
    description: 'Indicates which auth providers are enabled.',
    required: true,
    type: [AuthProviderDto],
  })
  providers!: AuthProviderDto[];

  @ApiProperty({
    description: 'Indicates if password authentication is enabled.',
    required: true,
  })
  enablePasswordAuth!: boolean;

  static fromDomain(source: AuthConfig) {
    const result = new AuthSettingsDto();
    result.providers = [];
    result.enablePasswordAuth = source.enablePassword ?? false;

    if (source.github) {
      result.providers.push({
        name: 'github',
        displayName: 'Github',
        color: '#2b3137',
      });
    }

    if (source.google) {
      result.providers.push({
        name: 'google',
        displayName: 'Google',
        color: '#DB4437',
      });
    }

    if (source.microsoft) {
      result.providers.push({
        name: 'microsoft',
        displayName: 'Microsoft',
        color: '#00A4EF',
      });
    }

    if (source.oauth) {
      result.providers.push({
        name: 'oauth',
        displayName: source.oauth.brandName || 'OAUTH',
        color: source.oauth.brandName || '#555',
      });
    }

    return result;
  }
}

export class LoginDto {
  @ApiProperty({
    description: 'The email address.',
    required: true,
  })
  email!: string;

  @ApiProperty({
    description: 'The password.',
    required: true,
  })
  password!: string;
}

export class ProfileDto {
  @ApiProperty({
    description: 'The user ID from the auth provider.',
    required: true,
  })
  id!: string;

  @ApiProperty({
    description: 'The display name.',
    required: true,
  })
  name!: string;

  @ApiProperty({
    description: 'The email address.',
    required: true,
  })
  email!: string;

  @ApiProperty({
    description: 'The URL to an external picture.',
    required: false,
  })
  picture?: string;

  @ApiProperty({
    description: 'Indicates if the user is an admin.',
    required: true,
  })
  isAdmin!: boolean;

  static fromDomain(source: User) {
    const result = new ProfileDto();
    result.id = source.id;
    result.email = source.email;
    result.isAdmin = Array.isArray(source.userGroupIds) && source.userGroupIds.includes(BUILTIN_USER_GROUP_ADMIN);
    result.name = source.name ?? source.email;
    result.picture = source.picture;

    return result;
  }
}
