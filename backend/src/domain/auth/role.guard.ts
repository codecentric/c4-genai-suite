import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { BUILTIN_USER_GROUP_ADMIN } from '../database';
import { ROLE_KEY, UserRole } from './role.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [
      context.getHandler(), //
      context.getClass(),
    ];

    const requiredRole = this.reflector.getAllAndOverride<UserRole>(ROLE_KEY, targets);

    if (!requiredRole) {
      return true;
    }

    const request: Request = context.switchToHttp().getRequest();

    if (requiredRole === 'admin') {
      return Array.isArray(request.user?.userGroupIds) && request.user.userGroupIds.includes(BUILTIN_USER_GROUP_ADMIN);
    }

    return !!request.user;
  }
}
