import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp, type AppDependencies } from './app';
import { UserRole, type JwtPayload } from './server/types/auth';

// ---- Fake infrastructure deps ----

function makeDeps(pgOk = true, redisOk = true): AppDependencies {
  return {
    config: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      DATABASE_POOL_MIN: 1,
      DATABASE_POOL_MAX: 2,
      KAFKA_BROKERS: 'localhost:9092',
      KAFKA_CLIENT_ID: 'test',
      REDIS_URL: 'redis://localhost:6379',
      API_PORT: 3000,
      API_HOST: '0.0.0.0',
      JWT_SECRET: 'super-secret-key-for-testing-only',
      JWT_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      CORS_ORIGIN: '*',
      RATE_LIMIT_MAX: 1000,
      RATE_LIMIT_WINDOW_MS: 60_000,
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
    },
    postgres: {
      healthCheck: vi.fn().mockResolvedValue(pgOk),
      close: vi.fn(),
    } as never,
    redis: {
      healthCheck: vi.fn().mockResolvedValue(redisOk),
      close: vi.fn(),
    } as never,
  };
}

// ---- Tests ----

describe('Fastify app (integration)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(makeDeps());
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // --- Health routes ---

  describe('GET /healthz', () => {
    it('returns 200 with status ok', async () => {
      const res = await app.inject({ method: 'GET', url: '/healthz' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ status: 'ok' });
    });

    it('echoes x-correlation-id response header', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/healthz',
        headers: { 'x-correlation-id': 'my-trace-id' },
      });
      expect(res.headers['x-correlation-id']).toBe('my-trace-id');
    });

    it('generates correlation id if header is absent', async () => {
      const res = await app.inject({ method: 'GET', url: '/healthz' });
      expect(res.headers['x-correlation-id']).toBeTruthy();
    });
  });

  describe('GET /readyz', () => {
    it('returns 200 when postgres and redis are healthy', async () => {
      const res = await app.inject({ method: 'GET', url: '/readyz' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ status: 'ok', checks: { postgres: 'ok', redis: 'ok' } });
    });

    it('returns 503 when postgres is down', async () => {
      const degradedApp = await buildApp(makeDeps(false, true));
      await degradedApp.ready();
      const res = await degradedApp.inject({ method: 'GET', url: '/readyz' });
      expect(res.statusCode).toBe(503);
      expect(res.json()).toMatchObject({ status: 'degraded', checks: { postgres: 'fail' } });
      await degradedApp.close();
    });
  });

  // --- Error handler ---

  describe('404 for unknown routes', () => {
    it('returns structured error body', async () => {
      const res = await app.inject({ method: 'GET', url: '/not-a-real-route' });
      expect(res.statusCode).toBe(404);
      const body = res.json();
      expect(body).toMatchObject({ statusCode: 404, correlationId: expect.any(String) });
    });
  });

  // --- JWT / auth ---
  // Uses its own app instance so the protected route can be registered before ready().
  // Fastify freezes the router after ready() — routes cannot be added afterwards.

  describe('JWT authentication', () => {
    let authApp: FastifyInstance;

    beforeAll(async () => {
      const { authenticate } = await import('./server/hooks/authenticate.hook');
      authApp = await buildApp(makeDeps());
      authApp.get('/test-protected', { preHandler: [authenticate] }, async () => ({ ok: true }));
      await authApp.ready();
    });

    afterAll(async () => {
      await authApp.close();
    });

    it('rejects request with no token with 401', async () => {
      const res = await authApp.inject({ method: 'GET', url: '/test-protected' });
      expect(res.statusCode).toBe(401);
    });

    it('accepts request with a valid JWT', async () => {
      const payload: JwtPayload = {
        sub: 'user-123',
        roles: [UserRole.CONSUMER],
        sessionId: 'sess-abc',
      };
      const token = authApp.jwt.sign(payload);
      const res = await authApp.inject({
        method: 'GET',
        url: '/test-protected',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  // --- CORS ---

  describe('CORS', () => {
    it('includes Access-Control-Allow-Origin header on responses', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/healthz',
        headers: { origin: 'http://localhost:3001' },
      });
      expect(res.headers['access-control-allow-origin']).toBeDefined();
    });
  });
});