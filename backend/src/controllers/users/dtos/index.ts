import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsOptional, IsString, Length } from 'class-validator';
import { User, UserGroup } from 'src/domain/users';

export class UpsertUserDto {
  @ApiProperty({
    description: 'The display name.',
    required: true,
  })
  @IsDefined()
  @IsString()
  @Length(0, 100)
  name!: string;

  @ApiProperty({
    description: 'The email address.',
    required: true,
  })
  @IsDefined()
  @IsString()
  @Length(0, 100)
  email!: string;

  @ApiProperty({
    description: 'The optional password.',
    required: false,
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({
    description: 'The user group ID.',
    required: true,
  })
  @IsDefined()
  @IsString()
  userGroupId!: string;

  @ApiProperty({
    description: 'The API Key.',
    required: false,
  })
  @IsOptional()
  @IsString()
  apiKey?: string;
}

export class UserDto {
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
    description: ' The URL to an external picture.',
    required: false,
  })
  picture?: string;

  @ApiProperty({
    description: 'The API Key.',
    required: false,
  })
  apiKey?: string;

  @ApiProperty({
    description: 'The user group ID.',
    required: true,
  })
  userGroupId!: string;

  @ApiProperty({
    description: 'Indicates if the user has a password configured.',
    required: true,
  })
  hasPassword!: boolean;

  @ApiProperty({
    description: 'Indicates if the user has an api key configured.',
    required: true,
  })
  hasApiKey!: boolean;

  static fromDomain(this: void, source: User) {
    const result = new UserDto();
    result.id = source.id;
    result.apiKey = source.apiKey;
    result.email = source.email;
    result.hasPassword = source.hasPassword ?? false;
    result.hasApiKey = source.hasApiKey ?? false;
    result.name = source.name;
    result.userGroupId = source.userGroupId;

    return result;
  }
}

export class UsersDto {
  @ApiProperty({
    description: 'The users.',
    required: true,
    type: [UserDto],
  })
  items!: UserDto[];

  @ApiProperty({
    description: 'The total number of users.',
    required: true,
  })
  total!: number;

  static fromDomain(source: User[], total: number) {
    const result = new UsersDto();
    result.total = total;
    result.items = source.map(UserDto.fromDomain);

    return result;
  }
}

export class UpsertUserGroupDto {
  @ApiProperty({
    description: 'The display name.',
    required: true,
  })
  @IsDefined()
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'The monthly allowed tokens for all users in the group.',
    required: false,
  })
  monthlyTokens?: number;

  @ApiProperty({
    description: 'The monthly allowed tokens per user in the group.',
    required: false,
  })
  monthlyUserTokens?: number;
}

export class UserGroupDto {
  @ApiProperty({
    description: 'The ID of the user group.',
    required: true,
  })
  id!: string;

  @ApiProperty({
    description: 'The display name.',
    required: true,
  })
  name!: string;

  @ApiProperty({
    description: 'Indicates if the users are admins.',
    required: true,
  })
  isAdmin!: boolean;

  @ApiProperty({
    description: 'Indicates if the user group is builtin and cannot be deleted.',
    required: true,
  })
  isBuiltIn!: boolean;

  @ApiProperty({
    description: 'The monthly allowed tokens for all users in the group.',
    required: false,
  })
  monthlyTokens?: number;

  @ApiProperty({
    description: 'The monthly allowed tokens per user in the group.',
    required: false,
  })
  monthlyUserTokens?: number;

  static fromDomain(this: void, source: UserGroup) {
    const result = new UserGroupDto();
    result.id = source.id;
    result.isAdmin = source.isAdmin;
    result.isBuiltIn = source.isBuiltIn;
    result.monthlyTokens = source.monthlyTokens;
    result.monthlyUserTokens = source.monthlyUserTokens;
    result.name = source.name;

    return result;
  }
}

export class UserGroupsDto {
  @ApiProperty({
    description: 'The user groups.',
    required: true,
    type: [UserGroupDto],
  })
  items!: UserGroupDto[];

  static fromDomain(source: UserGroup[]) {
    const result = new UserGroupsDto();
    result.items = source.map(UserGroupDto.fromDomain);

    return result;
  }
}
