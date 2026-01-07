import { http, HttpResponse, JsonBodyType, RequestHandler } from 'msw';
import { server } from '../../mock/node';

export class mockedAPI {
  private readonly handler: RequestHandler[];

  constructor() {
    this.handler = [];
  }

  withGet<T extends JsonBodyType = never>(path: string, response: NoInfer<T>) {
    this.handler.push(
      http.get(`${import.meta.env.VITE_SERVER_URL}${path}`, () => {
        return HttpResponse.json(response);
      }),
    );
    return this;
  }

  withPost(path: string) {
    this.handler.push(
      http.post(`${import.meta.env.VITE_SERVER_URL}${path}`, () => {
        return HttpResponse.json();
      }),
    );
    return this;
  }

  withPostError(path: string) {
    this.handler.push(
      http.post(`${import.meta.env.VITE_SERVER_URL}${path}`, () => {
        return HttpResponse.error();
      }),
    );
    return this;
  }

  run() {
    server.use(...this.handler);
  }

  withGetError(path: string) {
    this.handler.push(
      http.get(`${import.meta.env.VITE_SERVER_URL}${path}`, () => {
        return HttpResponse.error();
      }),
    );
    return this;
  }
}
