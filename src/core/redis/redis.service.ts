import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import Redis, { Redis as RedisType, RedisKey, RedisValue } from 'ioredis';
import { redisConfig } from '../config/app.config';

@Injectable()
export class RedisService {
  private readonly redis: RedisType;

  constructor(
    @Inject(redisConfig.KEY)
    private redisConf: ConfigType<typeof redisConfig>,
  ) {
    const url = this.redisConf.url;
    this.redis = new Redis(url);
  }

  async get(key: RedisKey): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(
    key: RedisKey,
    value: RedisValue,
    mode?: 'EX' | 'PX' | 'NX' | 'XX',
    duration?: number,
  ): Promise<'OK' | null> {
    if (mode === 'EX' && duration) {
      return this.redis.setex(key, duration, value);
    }
    return this.redis.set(key, value);
  }

  async del(...keys: RedisKey[]): Promise<number> {
    return this.redis.del(...keys);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.redis.keys(pattern);
  }

  async lpush(key: RedisKey, value: RedisValue): Promise<number> {
    return this.redis.lpush(key, value);
  }

  async lrange(key: RedisKey, start: number, stop: number): Promise<string[]> {
    return this.redis.lrange(key, start, stop);
  }

  async ltrim(key: RedisKey, start: number, stop: number): Promise<'OK'> {
    return this.redis.ltrim(key, start, stop);
  }

  async compareAndSetEx(
    key: RedisKey,
    expectedValue: string,
    nextValue: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const script = `
local current = redis.call('GET', KEYS[1])
if not current then
  return 0
end
if current ~= ARGV[1] then
  return 0
end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
return 1
`;

    const result = await this.redis.eval(
      script,
      1,
      key,
      expectedValue,
      nextValue,
      String(ttlSeconds),
    );

    return Number(result) === 1;
  }
}
