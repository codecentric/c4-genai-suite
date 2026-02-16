import { createHash, timingSafeEqual } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { isString } from 'class-validator';
import { Request } from 'express';
import { Strategy } from 'passport-custom';
import { UserEntity, UserRepository } from 'src/domain/database';
import { User } from 'src/domain/users';
import { isArray } from 'src/lib';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  private readonly headers = ['x-api-key', 'x-apikey', 'api-key', 'apikey', 'authorization', 'Authorization'];

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: UserRepository,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async validate(request: Request): Promise<Partial<User> | null> {
    // Try internal service authentication first (for service-to-service calls)
    const internalUser = this.tryInternalServiceAuth(request);
    if (internalUser) {
      return internalUser;
    }

    const key = this.findApiKey(request);

    if (key) {
      return this.userRepository.findOne({ where: { apiKey: key }, relations: ['userGroups'] });
    } else if (request.session.user) {
      return request.session.user;
    }

    return null;
  }

  private tryInternalServiceAuth(request: Request): Partial<User> | null {
    const serviceSecret = this.configService.get<string>('EVAL_SERVICE_SECRET');
    if (!serviceSecret) return null;

    const providedSecret = request.headers['x-internal-service-key'];
    if (!isString(providedSecret)) return null;

    // Timing-safe comparison to prevent timing attacks
    const provided = Buffer.from(providedSecret);
    const expected = Buffer.from(serviceSecret);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return null;
    }

    // Extract user context from headers
    const userId = request.headers['x-user-id'];
    const userName = request.headers['x-user-name'];
    if (!isString(userId) || !isString(userName)) return null;

    return { id: userId, name: userName };
  }

  private findApiKey(request: Request) {
    for (const candidate of this.headers) {
      const header = request.headers[candidate];
      const value = isArray(header) ? header[0] : header;

      if (isString(value) && value.trim().length > 0) {
        return createHash('sha256').update(value.replace('Bearer ', '')).digest('hex');
      }
    }

    return null;
  }
}
