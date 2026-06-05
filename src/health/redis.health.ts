import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string) {
    const indicator = this.healthIndicatorService.check(key);
    try {
      const result = await this.redis.ping();
      if (result !== 'PONG') {
        return indicator.down({ message: 'Unexpected ping response' });
      }
      return indicator.up();
    } catch {
      return indicator.down({ message: 'Redis connection failed' });
    }
  }
}
