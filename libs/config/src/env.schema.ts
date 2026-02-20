import { z } from 'zod';

export const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MIN: z.coerce.number().int().min(1).default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).default(10),

  // Kafka
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('workalaya-api'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // API
  API_PORT: z.coerce.number().int().default(3000),
  API_HOST: z.string().default('0.0.0.0'),

  // Auth
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;

let _config: EnvConfig | null = null;

export function loadEnv(overrides?: Record<string, string>, ignoreSystemEnv = false): EnvConfig {
  const source = ignoreSystemEnv ? { ...overrides } : { ...process.env, ...overrides };
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${formatted}`);
  }
  _config = result.data;
  return _config;
}

export function getEnv(): EnvConfig {
  if (!_config) {
    throw new Error('Environment not loaded. Call loadEnv() first.');
  }
  return _config;
}
