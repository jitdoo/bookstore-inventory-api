import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { UsersService } from '../users/users.service';
import {
  REFRESH_ABSOLUTE_DAYS,
  REFRESH_SLIDING_DAYS,
  ACCESS_TOKEN_EXPIRES_SEC,
  JwtPayload,
} from './auth.config';

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_SEC = 24 * 60 * 60;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify the password using argon2
    if (!(await argon2.verify(user.passwordHash, password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const absoluteExpiresAt = Date.now() + REFRESH_ABSOLUTE_DAYS * DAY_MS;
    const tokens = await this.issueTokens(
      user.id,
      user.role,
      absoluteExpiresAt,
    );

    // Signal whether the password must be changed on first login
    return {
      ...tokens,
      tokenType: 'Bearer',
      expiresIn: ACCESS_TOKEN_EXPIRES_SEC,
      userId: user.id,
      mustChangePassword: user.passwordUpdatedAt === null,
    };
  }

  async refresh(presentedToken: string) {
    // decode the presented token to get the user ID
    let decoded: JwtPayload;
    try {
      decoded = this.jwtService.verify<JwtPayload>(presentedToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userId = decoded.sub;
    const key = this.refreshKey(userId);
    const stored = await this.redis.get(key);
    if (!stored) {
      throw new UnauthorizedException('Refresh token not found');
    }

    // parse the stored token data
    const { tokenHash, absoluteExpiresAt, role } = JSON.parse(stored) as {
      tokenHash: string;
      absoluteExpiresAt: number;
      role: string;
    };

    // Verify the presented token against the stored hash
    if (!(await argon2.verify(tokenHash, presentedToken))) {
      // revoke this token
      await this.redis.del(key);
      throw new UnauthorizedException('Refresh token mismatch');
    }

    // Reject if absolute expiration (90 days) is exceeded
    if (Date.now() > absoluteExpiresAt) {
      await this.redis.del(key);
      throw new UnauthorizedException('Session expired');
    }

    // revoke the old token and issue a new one
    await this.redis.del(key);
    return this.issueTokens(userId, role, absoluteExpiresAt);
  }

  async logout(userId: string) {
    await this.redis.del(this.refreshKey(userId));
  }

  private async issueTokens(
    userId: string,
    role: string,
    absoluteExpiresAt: number,
  ) {
    // Create an access token with an expiration of 20 minutes
    const accessToken = this.jwtService.sign({
      sub: userId,
      role,
    });

    // Create a refresh token with a sliding expiration of 14 days
    const refreshToken = this.jwtService.sign(
      { sub: userId, role },
      { expiresIn: `${REFRESH_SLIDING_DAYS}d` },
    );

    // Store a hash of the refresh token with the absolute expiry and role in Redis
    const tokenHash = await argon2.hash(refreshToken);
    await this.redis.set(
      this.refreshKey(userId),
      JSON.stringify({ tokenHash, absoluteExpiresAt, role }),
      'EX',
      REFRESH_SLIDING_DAYS * DAY_SEC,
    );

    return { accessToken, refreshToken };
  }

  private refreshKey(userId: string): string {
    return `refresh:${userId}`;
  }
}
