import { createClient } from 'redis';

const RedisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;

export const redisClient = createClient({
  url: RedisUrl,
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('✅ Redis connected'));

export const connectRedis = async () => {
  await redisClient.connect();
};

export const disconnectRedis = async () => {
  await redisClient.disconnect();
};
