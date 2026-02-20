import { loadEnv } from '@workalaya/config';
import { PostgresClient, RedisClient } from '@workalaya/shared-kernel';
import { buildApp } from './app';

async function main(): Promise<void> {
  const config = loadEnv();

  const postgres = new PostgresClient({
    connectionString: config.DATABASE_URL,
    min: config.DATABASE_POOL_MIN,
    max: config.DATABASE_POOL_MAX,
  });

  const redis = new RedisClient({ url: config.REDIS_URL });
  await redis.connect();

  const app = await buildApp({ config, postgres, redis });

  try {
    await app.listen({ port: config.API_PORT, host: config.API_HOST });
  } catch (err) {
    app.log.error(err, 'failed to start server');
    await postgres.close();
    await redis.close();
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'shutdown signal received');
    await app.close();
    await postgres.close();
    await redis.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});