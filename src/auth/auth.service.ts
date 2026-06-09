import {
  Inject,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
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
    const mustChangePassword = user.passwordUpdatedAt === null;
    const tokens = await this.issueTokens(
      user.id,
      user.role,
      absoluteExpiresAt,
      mustChangePassword,
    );

    // Signal whether the password must be changed on first login
    return {
      ...tokens,
      tokenType: 'Bearer',
      expiresIn: ACCESS_TOKEN_EXPIRES_SEC,
      userId: user.id,
      mustChangePassword,
    };
  }

  async refresh(presentedToken: string) {
    let decoded: JwtPayload;
    try {
      decoded = this.jwtService.verify<JwtPayload>(presentedToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userId = decoded.sub;

    // Look up the stored token hash and absolute expiry in Redis
    const stored = await this.redis.get(this.refreshKey(userId));

    if (!stored) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const { tokenHash, absoluteExpiresAt } = JSON.parse(stored) as {
      tokenHash: string;
      absoluteExpiresAt: number;
    };

    if (!(await argon2.verify(tokenHash, presentedToken))) {
      await this.redis.del(this.refreshKey(userId));
      throw new UnauthorizedException('Refresh token mismatch');
    }

    if (Date.now() > absoluteExpiresAt) {
      await this.redis.del(this.refreshKey(userId));
      throw new UnauthorizedException('Session expired');
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      await this.redis.del(this.refreshKey(userId));
      throw new UnauthorizedException('User not found');
    }

    await this.redis.del(this.refreshKey(userId));

    return this.issueTokens(
      user.id,
      user.role,
      absoluteExpiresAt,
      user.passwordUpdatedAt === null,
    );
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Reject if the new password is the same as the current one
    if (await argon2.verify(user.passwordHash, newPassword)) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }

    const newHash = await argon2.hash(newPassword);
    await this.usersService.updatePassword(userId, newHash);

    // Revoke the current session so the user re-logs in with the new password
    await this.redis.del(this.refreshKey(userId));
  }

  async logout(userId: string) {
    await this.redis.del(this.refreshKey(userId));
  }

  private async issueTokens(
    userId: string,
    role: string,
    absoluteExpiresAt: number,
    mustChangePassword: boolean,
  ) {
    // Create an access token with an expiration of 20 minutes
    const accessToken = this.jwtService.sign({
      sub: userId,
      role,
      mustChangePassword,
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
