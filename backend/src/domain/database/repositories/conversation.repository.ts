import { Repository } from 'typeorm';
import { getStartDate, GroupBy } from 'src/domain/chat/statistics';
import { ConversationEntity } from '../entities';
import { UsagesCount } from '../interfaces';
import { dateTrunc, interval, schema } from '../typeorm.helper';

export class ConversationRepository extends Repository<ConversationEntity> {
  async getUsersCountByPeriod(since: Date | undefined, groupBy: GroupBy): Promise<UsagesCount[]> {
    const dateColumn = 'm."createdAt"';
    const condition = since ? `m.type = 'human' AND ${dateColumn} >= $1` : `m.type = 'human'`;
    const params = since ? [getStartDate(since, groupBy)] : [];

    const start = since
      ? dateTrunc(groupBy, '($1)::date')
      : dateTrunc(groupBy, `(SELECT MIN(${dateColumn}) FROM ${schema}.messages m WHERE ${condition})`);
    const end = dateTrunc(groupBy, 'NOW()');

    const sql = `
      WITH series AS (SELECT generate_series(
              ${start},
              ${end},
              ${interval(groupBy)}
      )::date AS "date"),
      dataset AS (
          SELECT
              ${dateTrunc(groupBy, dateColumn)} as "date",
              COUNT(distinct c."userId") AS total
          FROM ${schema}.messages m
          LEFT JOIN ${schema}.conversations c on c.id = m."conversationId"
          WHERE ${condition}
          GROUP BY ${dateTrunc(groupBy, dateColumn)}
      )
      SELECT s."date",
           COALESCE(d."total", 0) AS "total"
           FROM series s
           LEFT JOIN dataset d ON s."date" = d."date"
           ORDER BY s."date"
    `;

    const rawResults = await this.query<
      Array<{
        date: Date;
        total: string;
      }>
    >(sql, params);

    return rawResults.map((x) => ({
      ...x,
      total: Number(x.total),
    }));
  }
}
