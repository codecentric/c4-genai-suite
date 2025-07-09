import { Column, Entity, PrimaryColumn } from 'typeorm';
import { UsageRepository } from '../repositories/usage.repository';
import { schema } from '../typeorm.helper';

@Entity({ name: 'usages', schema })
export class UsageEntity {
  @PrimaryColumn({ type: 'timestamptz' })
  date!: Date;

  @PrimaryColumn()
  userId!: string;

  @PrimaryColumn()
  userGroup!: string;

  @PrimaryColumn()
  counter!: string;

  @PrimaryColumn()
  key!: string;

  @PrimaryColumn()
  subKey!: string;

  @Column()
  count!: number;
}

export async function trackUsage(usages: UsageRepository, args: UsageEntity) {
  const { count, date, ...other } = args;
  const increment = async () => {
    return await usages.increment(
      {
        ...other,
        date,
      },
      'count',
      count,
    );
  };

  const update = await increment();

  if (!update.affected) {
    try {
      await usages.insert({ ...other, date, count });
    } catch {
      await increment();
    }
  }
}
