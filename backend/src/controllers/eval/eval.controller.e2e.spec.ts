import { Server } from 'http';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { MockAgent, MockPool, setGlobalDispatcher } from 'undici';
import { AppModule } from 'src/app.module';
import { LocalStrategy, RoleGuard } from 'src/domain/auth';
import { BUILTIN_USER_GROUP_ADMIN } from 'src/domain/database';

const EVAL_SERVICE_URL = 'http://localhost:3202';

const mockAdminUser = {
  id: '1',
  name: 'Admin User',
  email: 'admin@test.com',
  userGroups: [{ id: BUILTIN_USER_GROUP_ADMIN }],
};

const mockNonAdminUser = {
  id: '2',
  name: 'Regular User',
  email: 'user@test.com',
  userGroups: [{ id: 'regular-group' }],
};

describe('EvalController (e2e)', () => {
  let app: INestApplication<Server>;
  let localStrategy: LocalStrategy;
  let roleGuard: RoleGuard;
  let mockAgent: MockAgent;
  let mockPool: MockPool;

  beforeAll(async () => {
    // Set up undici mock agent
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
    mockPool = mockAgent.get(EVAL_SERVICE_URL);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // DataSource is initialized by the module but not used directly in tests
    moduleFixture.get<DataSource>(getDataSourceToken());
    app = moduleFixture.createNestApplication();

    // Set global prefix as done in main.ts
    app.setGlobalPrefix('api');

    localStrategy = app.get<LocalStrategy>(LocalStrategy);
    roleGuard = app.get<RoleGuard>(RoleGuard);

    await app.init();
  }, 30000);

  afterAll(async () => {
    await mockAgent.close();
    await app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Authentication & Authorization', () => {
    it('should deny unauthenticated requests (401)', async () => {
      // When no valid session exists, LocalAuthGuard rejects the request
      // We simulate this by having validate return null/undefined
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      jest.spyOn(localStrategy, 'validate').mockResolvedValue(null as any);

      await request(app.getHttpServer()).get('/api/eval/catalogs').expect(HttpStatus.UNAUTHORIZED);
    });

    it('should deny non-admin requests (403)', async () => {
      jest.spyOn(localStrategy, 'validate').mockResolvedValue(mockNonAdminUser);
      jest.spyOn(roleGuard, 'canActivate').mockReturnValue(false);

      await request(app.getHttpServer()).get('/api/eval/catalogs').expect(HttpStatus.FORBIDDEN);
    });

    it('should allow admin requests', async () => {
      jest.spyOn(localStrategy, 'validate').mockResolvedValue(mockAdminUser);
      jest.spyOn(roleGuard, 'canActivate').mockReturnValue(true);

      mockPool
        .intercept({ path: '/catalogs', method: 'GET' })
        .reply(200, JSON.stringify({ data: 'success' }), { headers: { 'content-type': 'application/json' } });

      await request(app.getHttpServer()).get('/api/eval/catalogs').expect(HttpStatus.OK);
    });
  });

  describe('HTTP Methods Forwarding', () => {
    beforeEach(() => {
      jest.spyOn(localStrategy, 'validate').mockResolvedValue(mockAdminUser);
      jest.spyOn(roleGuard, 'canActivate').mockReturnValue(true);
    });

    it('should proxy GET requests', async () => {
      mockPool
        .intercept({ path: '/catalogs', method: 'GET' })
        .reply(200, JSON.stringify({ catalogs: [] }), { headers: { 'content-type': 'application/json' } });

      const response = await request(app.getHttpServer()).get('/api/eval/catalogs').expect(HttpStatus.OK);

      expect(response.body).toEqual({ catalogs: [] });
    });

    it('should proxy POST requests with body', async () => {
      const requestBody = { name: 'Test Catalog', type: 'RAGAS' };
      const responseBody = { id: '123', ...requestBody };

      mockPool
        .intercept({ path: '/catalogs', method: 'POST' })
        .reply(201, JSON.stringify(responseBody), { headers: { 'content-type': 'application/json' } });

      const response = await request(app.getHttpServer()).post('/api/eval/catalogs').send(requestBody).expect(HttpStatus.CREATED);

      expect(response.body).toEqual(responseBody);
    });

    it('should proxy PUT requests', async () => {
      const requestBody = { name: 'Updated Catalog' };
      const responseBody = { id: '123', ...requestBody };

      mockPool
        .intercept({ path: '/catalogs/123', method: 'PUT' })
        .reply(200, JSON.stringify(responseBody), { headers: { 'content-type': 'application/json' } });

      const response = await request(app.getHttpServer()).put('/api/eval/catalogs/123').send(requestBody).expect(HttpStatus.OK);

      expect(response.body).toEqual(responseBody);
    });

    it('should proxy DELETE requests', async () => {
      mockPool.intercept({ path: '/catalogs/123', method: 'DELETE' }).reply(204);

      await request(app.getHttpServer()).delete('/api/eval/catalogs/123').expect(HttpStatus.NO_CONTENT);
    });
  });

  describe('Headers Forwarding', () => {
    beforeEach(() => {
      jest.spyOn(localStrategy, 'validate').mockResolvedValue(mockAdminUser);
      jest.spyOn(roleGuard, 'canActivate').mockReturnValue(true);
    });

    it('should forward user headers (X-User-Id, X-User-Name, X-User-Email)', async () => {
      // Note: undici MockAgent doesn't easily allow header inspection, but we can verify
      // the request succeeds, which proves headers are being forwarded correctly
      // (The proxy adds X-User-* headers from req.user, which we've mocked)
      mockPool
        .intercept({
          path: '/catalogs',
          method: 'GET',
          headers: {
            'x-user-id': mockAdminUser.id,
            'x-user-name': mockAdminUser.name,
            'x-user-email': mockAdminUser.email,
          },
        })
        .reply(200, JSON.stringify({ data: 'success' }), { headers: { 'content-type': 'application/json' } });

      await request(app.getHttpServer()).get('/api/eval/catalogs').expect(HttpStatus.OK);
    });

    it('should forward Content-Type header', async () => {
      mockPool
        .intercept({
          path: '/catalogs',
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
        })
        .reply(201, JSON.stringify({ id: '123' }), { headers: { 'content-type': 'application/json' } });

      await request(app.getHttpServer())
        .post('/api/eval/catalogs')
        .set('Content-Type', 'application/json')
        .send({ name: 'Test' })
        .expect(HttpStatus.CREATED);
    });

    it('should set Content-Type to application/json for JSON bodies', async () => {
      mockPool
        .intercept({
          path: '/catalogs',
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
        })
        .reply(201, JSON.stringify({ id: '123' }), { headers: { 'content-type': 'application/json' } });

      await request(app.getHttpServer()).post('/api/eval/catalogs').send({ name: 'Test' }).expect(HttpStatus.CREATED);
    });
  });

  describe('Query String Handling', () => {
    beforeEach(() => {
      jest.spyOn(localStrategy, 'validate').mockResolvedValue(mockAdminUser);
      jest.spyOn(roleGuard, 'canActivate').mockReturnValue(true);
    });

    it('should forward query parameters', async () => {
      mockPool
        .intercept({ path: '/catalogs?limit=10&offset=0&name=test', method: 'GET' })
        .reply(200, JSON.stringify({ data: [] }), { headers: { 'content-type': 'application/json' } });

      await request(app.getHttpServer())
        .get('/api/eval/catalogs')
        .query({ limit: 10, offset: 0, name: 'test' })
        .expect(HttpStatus.OK);
    });

    it('should handle requests without query parameters', async () => {
      mockPool
        .intercept({ path: '/catalogs', method: 'GET' })
        .reply(200, JSON.stringify({ data: [] }), { headers: { 'content-type': 'application/json' } });

      await request(app.getHttpServer()).get('/api/eval/catalogs').expect(HttpStatus.OK);
    });
  });

  describe('Path Forwarding', () => {
    beforeEach(() => {
      jest.spyOn(localStrategy, 'validate').mockResolvedValue(mockAdminUser);
      jest.spyOn(roleGuard, 'canActivate').mockReturnValue(true);
    });

    it('should strip /api/eval prefix and forward correct path', async () => {
      mockPool
        .intercept({ path: '/catalogs/123', method: 'GET' })
        .reply(200, JSON.stringify({ id: '123' }), { headers: { 'content-type': 'application/json' } });

      await request(app.getHttpServer()).get('/api/eval/catalogs/123').expect(HttpStatus.OK);
    });

    it('should handle nested paths', async () => {
      mockPool
        .intercept({ path: '/catalogs/123/qa-pairs', method: 'GET' })
        .reply(200, JSON.stringify({ pairs: [] }), { headers: { 'content-type': 'application/json' } });

      await request(app.getHttpServer()).get('/api/eval/catalogs/123/qa-pairs').expect(HttpStatus.OK);
    });
  });

  describe('Response Forwarding', () => {
    beforeEach(() => {
      jest.spyOn(localStrategy, 'validate').mockResolvedValue(mockAdminUser);
      jest.spyOn(roleGuard, 'canActivate').mockReturnValue(true);
    });

    it('should forward response status codes', async () => {
      mockPool
        .intercept({ path: '/catalogs', method: 'POST' })
        .reply(201, JSON.stringify({ id: '123' }), { headers: { 'content-type': 'application/json' } });

      await request(app.getHttpServer()).post('/api/eval/catalogs').send({ name: 'Test' }).expect(HttpStatus.CREATED);
    });

    it('should forward response headers', async () => {
      mockPool.intercept({ path: '/catalogs', method: 'GET' }).reply(200, JSON.stringify({ data: [] }), {
        headers: { 'content-type': 'application/json', 'X-Custom-Header': 'custom-value', 'X-Total-Count': '42' },
      });

      const response = await request(app.getHttpServer()).get('/api/eval/catalogs').expect(HttpStatus.OK);

      expect(response.headers['x-custom-header']).toBe('custom-value');
      expect(response.headers['x-total-count']).toBe('42');
    });

    it('should forward response body', async () => {
      const responseData = { id: '123', name: 'Test Catalog', status: 'READY' };
      mockPool
        .intercept({ path: '/catalogs/123', method: 'GET' })
        .reply(200, JSON.stringify(responseData), { headers: { 'content-type': 'application/json' } });

      const response = await request(app.getHttpServer()).get('/api/eval/catalogs/123').expect(HttpStatus.OK);

      expect(response.body).toEqual(responseData);
    });

    it('should forward binary responses', async () => {
      const binaryData = Buffer.from('test file content', 'utf-8');
      mockPool
        .intercept({ path: '/catalogs/123/download', method: 'GET' })
        .reply(200, binaryData, { headers: { 'Content-Type': 'application/octet-stream' } });

      const response = await request(app.getHttpServer()).get('/api/eval/catalogs/123/download').expect(HttpStatus.OK);

      expect(Buffer.from(response.body)).toEqual(binaryData);
      expect(response.headers['content-type']).toBe('application/octet-stream');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      jest.spyOn(localStrategy, 'validate').mockResolvedValue(mockAdminUser);
      jest.spyOn(roleGuard, 'canActivate').mockReturnValue(true);
    });

    it('should return 502 when eval service is unavailable', async () => {
      mockPool.intercept({ path: '/catalogs', method: 'GET' }).replyWithError(new Error('Service unavailable'));

      const response = await request(app.getHttpServer()).get('/api/eval/catalogs').expect(HttpStatus.BAD_GATEWAY);

      expect((response.body as { error: string; message: string }).error).toBe('Bad Gateway');
      expect((response.body as { error: string; message: string }).message).toBe('Eval service is unavailable');
    });

    it('should forward error responses from eval service', async () => {
      const errorBody = { error: 'Bad Request', message: 'Invalid catalog name' };
      mockPool
        .intercept({ path: '/catalogs', method: 'POST' })
        .reply(400, JSON.stringify(errorBody), { headers: { 'content-type': 'application/json' } });

      const response = await request(app.getHttpServer())
        .post('/api/eval/catalogs')
        .send({ name: '' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toEqual(errorBody);
    });

    it('should forward 404 responses from eval service', async () => {
      const errorBody = { error: 'Not Found', message: 'Catalog not found' };
      mockPool
        .intercept({ path: '/catalogs/nonexistent', method: 'GET' })
        .reply(404, JSON.stringify(errorBody), { headers: { 'content-type': 'application/json' } });

      const response = await request(app.getHttpServer()).get('/api/eval/catalogs/nonexistent').expect(HttpStatus.NOT_FOUND);

      expect(response.body).toEqual(errorBody);
    });

    it('should forward 500 responses from eval service', async () => {
      const errorBody = { error: 'Internal Server Error', message: 'Something went wrong' };
      mockPool
        .intercept({ path: '/catalogs', method: 'GET' })
        .reply(500, JSON.stringify(errorBody), { headers: { 'content-type': 'application/json' } });

      const response = await request(app.getHttpServer()).get('/api/eval/catalogs').expect(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(response.body).toEqual(errorBody);
    });
  });
});
