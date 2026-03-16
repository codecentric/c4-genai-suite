import { Injectable } from '@nestjs/common';

@Injectable()
export class ActiveChatStreamService {
  private readonly streams = new Map<string, AbortController>();

  register(conversationId: number, userId: number | string, abortController: AbortController) {
    const key = this.buildKey(conversationId, userId);
    const previousController = this.streams.get(key);

    if (previousController && previousController !== abortController && !previousController.signal.aborted) {
      previousController.abort('replaced');
    }

    this.streams.set(key, abortController);
  }

  cancel(conversationId: number, userId: number | string, reason: string = 'cancelled') {
    const key = this.buildKey(conversationId, userId);
    const abortController = this.streams.get(key);
    if (!abortController) {
      return false;
    }

    this.streams.delete(key);
    if (!abortController.signal.aborted) {
      abortController.abort(reason);
    }

    return true;
  }

  clear(conversationId: number, userId: number | string, abortController?: AbortController) {
    const key = this.buildKey(conversationId, userId);
    const activeController = this.streams.get(key);
    if (!activeController) {
      return;
    }

    if (abortController && activeController !== abortController) {
      return;
    }

    this.streams.delete(key);
  }

  private buildKey(conversationId: number, userId: number | string) {
    return `${userId}:${conversationId}`;
  }
}
