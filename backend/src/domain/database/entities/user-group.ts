import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryColumn,
  RelationId,
  Repository,
  UpdateDateColumn,
} from 'typeorm';
import { schema } from '../typeorm.helper';
import { ConfigurationEntity } from './configuration';
import { FileEntity } from './file';
import { UserEntity } from './user';

export type UserGroupRepository = Repository<UserGroupEntity>;

@Entity({ name: 'user-groups', schema })
export class UserGroupEntity {
  @PrimaryColumn()
  id!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ default: false })
  isAdmin!: boolean;

  @Column({ default: false })
  isBuiltIn!: boolean;

  @Column({ nullable: true })
  monthlyTokens?: number;

  @Column({ nullable: true })
  monthlyUserTokens?: number;

  @OneToMany(() => UserEntity, (user) => user.userGroup, { onDelete: 'RESTRICT' })
  users!: FileEntity[];

  @ManyToMany(() => ConfigurationEntity, (configuration) => configuration.userGroups)
  configurations!: ConfigurationEntity[];

  @RelationId('configurations')
  configurationIds!: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

export const BUILTIN_USER_GROUP_ADMIN = 'admin';
export const BUILTIN_USER_GROUP_DEFAULT = 'default';
