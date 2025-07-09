import { SessionData } from 'express-session';
import { Column, Entity, ManyToOne, PrimaryColumn, Repository } from 'typeorm';
import { schema } from '../typeorm.helper';
import { UserEntity } from './user';

export type SessionRepository = Repository<SessionEntity>;

@Entity({ name: 'sessions', schema })
export class SessionEntity {
  @PrimaryColumn()
  id!: string;

  @Column('simple-json')
  value!: SessionData;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'CASCADE' })
  user!: UserEntity | null;

  @Column({ nullable: true })
  userId?: string;
}
