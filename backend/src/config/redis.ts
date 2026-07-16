import { env } from '@/utils/envConfig';
import Redis from 'ioredis';

let redisUrl = process.env.REDIS_URL || "";

if (!redisUrl && env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
  // Convert Upstash REST URL to standard rediss URL for ioredis
  const urlObj = new URL(env.UPSTASH_REDIS_REST_URL);
  redisUrl = `rediss://default:${env.UPSTASH_REDIS_REST_TOKEN}@${urlObj.hostname}:6379`;
}

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
});

export const startRedis = async () => {
  // ioredis connects automatically, just checking ping
  await redis.ping();
};

redis.on("connect", () => {
  console.log("✅ Redis connected (ioredis)");
});

redis.on("error", (err) => {
  console.error("❌ Redis error:", err.message);
});