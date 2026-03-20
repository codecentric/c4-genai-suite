import { Repository } from 'typeorm';
import { getStartDate, GroupBy } from '../../chat/statistics';
import { MessageEntity } from '../entities';
import { AssistantsCount } from '../interfaces';
import { dateTrunc, interval, schema } from '../typeorm.helper';

export interface MessagesCount {
  total: number;
  date: Date;
}

export class MessageRepository extends Repository<MessageEntity> {
  async getMessageThread(conversationId: number, messageId?: number, fetchLatestConversation = true) {
    const messages = await this.findBy({ conversationId });
    const map = new Map<number, MessageEntity>(messages.map((message) => [message.id, message]));

    if (!messageId && fetchLatestConversation) {
      // if no message is given we just assume it is the latest one in the conversation
      const message = await this.findOne({
        where: {
          conversationId,
        },
        order: {
          id: 'DESC',
        },
      });
      messageId = message?.id;
    }

    const result: MessageEntity[] = [];
    while (messageId != null) {
      const message = map.get(messageId);
      if (!message) {
        break;
      }

      result.unshift(message);
      messageId = message.parentId;
    }

    return result;
  }

  async getMessageCount(since: Date | undefined, groupBy: GroupBy): Promise<MessagesCount[]> {
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
              COUNT(*) AS total
          FROM ${schema}.messages m
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

  async getAssistantsCount(since: Date | undefined, groupBy: GroupBy): Promise<AssistantsCount[]> {
    const dateColumn = 'm."createdAt"';
    const condition = since ? `m.type = 'human' AND ${dateColumn} >= $1` : `m.type = 'human'`;
    const params = since ? [getStartDate(since, groupBy)] : [];

    const start = since
      ? dateTrunc(groupBy, '($1)::date')
      : dateTrunc(groupBy, `(SELECT MIN(${dateColumn}) FROM ${schema}.messages m WHERE ${condition})`);
    const end = dateTrunc(groupBy, 'NOW()');

    const sql = `
      WITH series AS (
        SELECT generate_series(
          ${start},
          ${end},
          ${interval(groupBy)}
        )::date AS "date"
      ),
      dataset AS (
        SELECT
          ${dateTrunc(groupBy, dateColumn)} AS "date",
          cfg."name" AS "assistantName",
          COUNT(*) AS total
        FROM ${schema}.messages m
        INNER JOIN ${schema}.configurations cfg ON cfg.id = m."configurationId"
        WHERE ${condition}
        GROUP BY ${dateTrunc(groupBy, dateColumn)}, cfg."name"
      )
      SELECT
        s."date",
        d."assistantName",
        COALESCE(d.total, 0) AS "total"
      FROM series s
      LEFT JOIN dataset d ON s."date" = d."date"
      ORDER BY s."date", d."assistantName"
    `;

    const rawResults = await this.query<
      Array<{
        date: Date;
        assistantName: string | null;
        total: string;
      }>
    >(sql, params);

    const itemsByDate = new Map<string, AssistantsCount>();

    for (const row of rawResults) {
      const dateKey = row.date.toISOString();
      const item = itemsByDate.get(dateKey) ?? {
        date: row.date,
        total: 0,
        byAssistant: {},
      };

      if (row.assistantName) {
        const total = Number(row.total);
        item.total += total;
        item.byAssistant[row.assistantName] = total;
      }

      itemsByDate.set(dateKey, item);
    }

    return [...itemsByDate.values()];
  }
}
