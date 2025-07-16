import { Injectable } from '@nestjs/common';
import * as uuid from 'uuid';
import { ChatUICallbackResult, FormActionType } from '../interfaces';

export type CallbackResult<T> = { id: string; result: Promise<T> };

@Injectable()
export class CallbackService {
  private readonly results: Record<string, { created: number; result: Result; timeout?: number }> = {};

  private getTime = () => new Date().getTime();

  constructor() {
    setInterval(() => this.cleanup(), 1000);
  }

  complete(id: string, result: ChatUICallbackResult) {
    const stored = this.results[id];

    if (!stored) {
      return;
    }

    stored.result.complete(result);
    delete this.results[id];
    return;
  }

  cleanup() {
    const time = this.getTime();

    for (const [id, stored] of Object.entries(this.results)) {
      const age = time - stored.created;

      if (age < (stored.timeout ?? TIMEOUT)) {
        continue;
      }

      stored.result.complete({ action: FormActionType.CANCEL });
      delete this.results[id];
    }
  }

  form(timeout?: number): CallbackResult<ChatUICallbackResult> {
    return this.request(timeout);
  }

  private request(timeout?: number) {
    const requestId = uuid.v4();
    const result = new Result();

    this.results[requestId] = { result, created: this.getTime(), timeout };

    return { id: requestId, result: result.promise };
  }
}

const TIMEOUT = 5 * 60 * 1000;

class Result {
  private resolve?: (value: ChatUICallbackResult) => void;

  public promise = new Promise<any>((resolve) => {
    this.resolve = resolve;
  });

  public complete(result: ChatUICallbackResult) {
    this.resolve?.(result);
  }
}
