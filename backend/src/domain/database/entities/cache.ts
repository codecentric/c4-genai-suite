import { Column, Entity, PrimaryColumn, Repository } from 'typeorm';
import { schema } from '../typeorm.helper';

export type CacheRepository = Repository<CacheEntity>;

@Entity({ name: 'cache', schema })
export class CacheEntity {
  @PrimaryColumn()
  key!: string;

  @Column('simple-json')
  value!: string;

  @Column({ type: 'timestamptz' })
  expires!: Date;
}
