import { Injectable } from '@nestjs/common';
import { I18nContext, I18nService as NestI18nService } from 'nestjs-i18n';
import { IfAnyOrNever, Path, PathValue } from 'nestjs-i18n/dist/types';

@Injectable()
export class I18nService<K = Record<string, unknown>> {
  constructor(private readonly service: NestI18nService<K>) {}

  public t<P extends Path<K> = any, R = PathValue<K, P>>(key: P, args?: Record<string, any>): IfAnyOrNever<R, string, R> {
    return this.service.t(key, { args: args ?? {} });
  }

  public get language(): string | undefined {
    return I18nContext.current()?.lang;
  }
}
