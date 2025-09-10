import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SessionData, Store } from 'express-session';
import { SessionEntity, SessionRepository } from '../database';
import { buildUser } from '../users/use-cases/utils';

@Injectable()
export class SessionStorage extends Store {
  constructor(@InjectRepository(SessionEntity) private readonly sessionRepository: SessionRepository) {
    super();
  }

  get(id: string, callback: (err: any, session?: SessionData) => void): void {
    void this._get(id, callback);
  }

  private async _get(id: string, callback: (err: any, session?: SessionData) => void) {
    try {
      const session = await this.sessionRepository.findOne({
        where: { id },
        relations: {
          user: true,
        },
      });
      const sessionData = session?.value ? { ...session.value, user: session.user ? buildUser(session.user) : null } : undefined;
      callback(undefined, sessionData);
    } catch (err) {
      callback(err);
    }
  }

  set(id: string, session: SessionData, callback: (err?: any) => void): void {
    void this._set(id, session, callback);
  }

  private async _set(id: string, session: SessionData, callback: (err?: any) => void) {
    try {
      const { user, ...value } = session;
      await this.sessionRepository.save({ id, value, userId: user?.id });
      callback();
    } catch (err) {
      callback(err);
    }
  }

  destroy(id: string, callback: (err?: any) => void): void {
    void this._destroy(id, callback);
  }

  private async _destroy(id: string, callback: (err?: any) => void) {
    try {
      await this.sessionRepository.delete({ id });
      callback();
    } catch (err) {
      callback(err);
    }
  }
}
