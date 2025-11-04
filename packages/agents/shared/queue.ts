import Redis from "ioredis";
import { Msg } from "./types";
import { log } from "./logger";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
export const redis = new Redis(redisUrl);

export async function enqueue(queue: string, message: Msg) {
  await redis.lpush(queue, JSON.stringify(message));
  log("queue", `enqueued to ${queue}`, { task_id: message.task_id, intent: message.intent });
}

export async function consume<T = unknown>(
  queue: string,
  handler: (msg: Msg<T>) => Promise<void>
) {
  while (true) {
    const res = await redis.brpop(queue, 0);
    if (!res) continue;
    const [, raw] = res;
    const msg = JSON.parse(raw) as Msg<T>;
    await handler(msg);
  }
}
