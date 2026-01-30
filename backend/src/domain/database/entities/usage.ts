import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { UsageRepository } from '../repositories/usage.repository';
import { schema } from '../typeorm.helper';

@Entity({ name: 'usages', schema })
// Used by analytics: getRatingCount/getUsageCount filter by counter type and date range
// See: src/domain/database/repositories/usage.repository.ts
@Index(['counter', 'date'])
// Used by usage limit checks: sum by userId within date range
// See: src/domain/chat/middlewares/check-usage-middleware.ts
@Index(['userId', 'date'])
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
