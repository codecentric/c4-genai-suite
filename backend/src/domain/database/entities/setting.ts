import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Repository, UpdateDateColumn } from 'typeorm';
import { ChatSuggestion, SiteLink } from 'src/domain/shared';
import { schema } from '../typeorm.helper';

export type SettingRepository = Repository<SettingEntity>;

@Entity({ name: 'settings', schema })
export class SettingEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 2, nullable: true })
  language?: string;

  @Column({ length: 30, nullable: true })
  name?: string;

  @Column({ length: 20, nullable: true })
  primaryColor?: string;

  @Column({ length: 20, nullable: true })
  primaryContentColor?: string;

  @Column('text', { nullable: true })
  welcomeText?: string;

  @Column('text', { nullable: true })
  customCss?: string;

  @Column('text', { nullable: true })
  agentName?: string;

  @Column('text', { nullable: true })
  chatFooter?: string;

  @Column('json', { nullable: true })
  chatSuggestions?: ChatSuggestion[];

  @Column('json', { nullable: true })
  siteLinks?: SiteLink[];

  @Column('text', { nullable: true })
  logo?: string;

  @Column('text', { nullable: true })
  backgroundLogo?: string;

  @Column('text', { nullable: true })
  avatarLogo?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
