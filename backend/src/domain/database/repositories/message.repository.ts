import { Repository } from 'typeorm';
import { getStartDate, GroupBy } from '../../chat/statistics';
import { MessageEntity } from '../entities';
import { dateTrunc, interval } from '../typeorm.helper';

export interface MessagesCount {
  total: number;
  date: Date;
}

export class MessageRepository extends Repository<MessageEntity> {
  async getMessageThread(conversationId: number, messageId?: number) {
    const messages = await this.findBy({ conversationId });
    const map = new Map<number, MessageEntity>(messages.map((message) => [message.id, message]));

    if (!messageId) {
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

      result.push(message);
      messageId = message.parentId;
    }

    result.sort((a, b) => a.id - b.id);
    return result;
  }

  async getMessageCount(since: Date | undefined, groupBy: GroupBy): Promise<MessagesCount[]> {
    const dateColumn = 'm."createdAt"';
    const condition = since ? `m.type = 'human' AND ${dateColumn} >= $1` : `m.type = 'human'`;
    const params = since ? [getStartDate(since, groupBy)] : [];

    const start = since
      ? dateTrunc(groupBy, '($1)::date')
      : dateTrunc(groupBy, `(SELECT MIN(${dateColumn}) FROM messages m WHERE ${condition})`);
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
          FROM messages m
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
