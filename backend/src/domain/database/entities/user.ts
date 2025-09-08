import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryColumn,
  Repository,
  UpdateDateColumn,
} from 'typeorm';
import { schema } from '../typeorm.helper';
import { ConfigurationUserEntity } from './configuration-user';
import { ConversationEntity } from './conversation';
import { FileEntity } from './file';
import { UserGroupEntity } from './user-group';

export type UserRepository = Repository<UserEntity>;

@Entity({ name: 'users', schema })
export class UserEntity {
  @PrimaryColumn()
  id!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ length: 100, unique: true })
  email!: string;

  @Column({ length: 100, nullable: true, unique: true })
  apiKey?: string;

  @Column({ nullable: true })
  passwordHash?: string;

  @OneToMany(() => ConversationEntity, (conversation) => conversation.configuration, { onDelete: 'CASCADE' })
  conversations!: ConversationEntity[];

  @OneToMany(() => FileEntity, (file) => file.user, { onDelete: 'CASCADE' })
  files!: FileEntity[];

  @ManyToMany(() => UserGroupEntity, (userGroup) => userGroup.users, { cascade: true })
  @JoinTable({
    name: 'user_user_groups',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userGroupId', referencedColumnName: 'id' },
  })
  userGroups!: UserGroupEntity[];

  @OneToMany(() => ConfigurationUserEntity, (uc) => uc.user)
  configurations!: ConfigurationUserEntity[];

  // userGroups replaces userGroupId for multi-group support

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
