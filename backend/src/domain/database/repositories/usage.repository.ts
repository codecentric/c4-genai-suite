import { Repository } from 'typeorm';
import { getStartDate, GroupBy } from '../../chat/statistics';
import { UsageEntity } from '../entities';
import { dateTrunc, interval, schema } from '../typeorm.helper';

export interface UsagesCount {
  date: Date;
  total: number;
  byModel: Record<string, number>;
}

export interface RatingCount {
  date: Date;
  total: number;
  byCategory: Record<string, number>;
}

export class UsageRepository extends Repository<UsageEntity> {
  async getRatingCount(since: Date | undefined, groupBy: GroupBy): Promise<RatingCount[]> {
    const dateColumn = '"date"';
    const condition = since ? `counter = 'rating' AND ${dateColumn} >= $1` : `counter = 'rating'`;
    const params = since ? [getStartDate(since, groupBy)] : [];

    const start = since
      ? dateTrunc(groupBy, '($1)::date')
      : dateTrunc(groupBy, `(SELECT MIN(${dateColumn}) FROM ${schema}.usages WHERE ${condition})`);
    const end = dateTrunc(groupBy, 'NOW()');

    const sql = `
      WITH series AS (SELECT generate_series(
              ${start},
              ${end},
              ${interval(groupBy)}
      )::date AS "date"),
      dataset AS (
          SELECT
              "date",
              SUM("total") AS "total",
              JSONB_OBJECT_AGG("category", "total") AS "byCategory"
          FROM (
               SELECT
                   ${dateTrunc(groupBy, dateColumn)} as "date",
                   "key" AS category,
                   SUM("count") AS "total"
               FROM ${schema}.usages
               WHERE ${condition}
               GROUP BY ${dateTrunc(groupBy, dateColumn)}, "key"
           ) AS aggregated
          GROUP BY "date"
      )
      SELECT s."date",
           COALESCE(d."total", 0) AS "total",
           COALESCE(d."byCategory", '{}'::jsonb) AS "byCategory"
           FROM series s
           LEFT JOIN dataset d ON s."date" = d."date"
           ORDER BY s."date"
    `;

    const rawResults = await this.query<
      Array<{
        date: Date;
        total: string;
        byCategory: Record<string, number>;
      }>
    >(sql, params);

    return rawResults.map((x) => ({
      ...x,
      total: Number(x.total),
    }));
  }

  async getUsageCount(since: Date | undefined, groupBy: GroupBy): Promise<UsagesCount[]> {
    const dateColumn = '"date"';
    const condition = since ? `counter = 'token_usage' AND ${dateColumn} >= $1` : `counter = 'token_usage'`;
    const params = since ? [getStartDate(since, groupBy)] : [];

    const start = since
      ? dateTrunc(groupBy, '($1)::date')
      : dateTrunc(groupBy, `(SELECT MIN("date") FROM ${schema}.usages WHERE ${condition})`);
    const end = dateTrunc(groupBy, `(SELECT MAX("date") FROM ${schema}.usages WHERE ${condition})`);

    const sql = `
      WITH series AS (SELECT generate_series(
              ${start},
              ${end},
              ${interval(groupBy)}
      )::date AS "date"),
      dataset AS (
          SELECT
              "date",
              SUM("total") AS "total",
              JSONB_OBJECT_AGG("model", "total") AS "byModel"
          FROM (
                 SELECT
                     ${dateTrunc(groupBy, dateColumn)} as "date",
                     "key" || ' / ' || "subKey" AS model,
                     SUM("count") AS "total"
                 FROM ${schema}.usages
                 WHERE ${condition}
                 GROUP BY ${dateTrunc(groupBy, dateColumn)}, "key", "subKey"
             ) AS aggregated
        GROUP BY "date"
      )
      SELECT s."date",
           COALESCE(d."total", 0) AS "total",
           COALESCE(d."byModel", '{}'::jsonb) AS "byModel"
           FROM series s
           LEFT JOIN dataset d ON s."date" = d."date"
           ORDER BY s."date"
    `;

    const rawResults = await this.query<
      Array<{
        date: Date;
        total: string;
        byModel: Record<string, number>;
      }>
    >(sql, params);

    return rawResults.map((x) => ({
      ...x,
      total: Number(x.total),
    }));
  }
}
