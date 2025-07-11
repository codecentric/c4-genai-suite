import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Repository, Unique } from 'typeorm';
import { schema } from '../typeorm.helper';
import { ConfigurationEntity } from './configuration';
import { UserEntity } from './user';

export type ConfigurationValues = { [id: string]: Record<string, any> };

export type ConfigurationUserRepository = Repository<ConfigurationUserEntity>;

@Entity({ name: 'configurations_users', schema })
@Unique(['user.id', 'configuration.id', 'isDefault'])
export class ConfigurationUserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => ConfigurationEntity, (config) => config.users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'configurationId' })
  configuration!: ConfigurationEntity;

  @ManyToOne(() => UserEntity, (user) => user.configurations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({ default: false })
  isDefault!: boolean;

  @Column({ type: 'json', nullable: false })
  values!: ConfigurationValues;
}
