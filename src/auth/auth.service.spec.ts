import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { UserRole } from '../users/entities/user.entity';
import {
  ACCESS_TOKEN_EXPIRES_SEC,
  REFRESH_ABSOLUTE_DAYS,
  REFRESH_SLIDING_DAYS,
} from './auth.config';

const DAY_SEC = 24 * 60 * 60;

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { findByEmail: jest.Mock; findById: jest.Mock };
  let jwtService: { sign: jest.Mock; verify: jest.Mock };
  let redis: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    usersService = { findByEmail: jest.fn(), findById: jest.fn() };
    jwtService = {
      sign: jest.fn().mockReturnValue('signed.jwt.token'),
      verify: jest
        .fn()
        .mockReturnValue({ sub: '1', role: UserRole.SUPER_ADMIN }),
    };
    redis = { get: jest.fn(), set: jest.fn(), del: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: REDIS_CLIENT, useValue: redis },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('login', () => {
    it('throws when the user is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login('x@x.com', 'pw')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('throws when the password is invalid', async () => {
      const passwordHash = await argon2.hash('correct-password');
      usersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'a@a.com',
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        passwordUpdatedAt: new Date(),
      });

      await expect(service.login('a@a.com', 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('returns the full token response and stores the refresh token', async () => {
      const passwordHash = await argon2.hash('correct-password');
      usersService.findByEmail.mockResolvedValue({
        id: '42',
        email: 'admin@example.com',
        name: 'admin',
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        passwordUpdatedAt: null,
      });

      const result = await service.login(
        'admin@example.com',
        'correct-password',
      );

      // full response shape
      expect(result).toEqual({
        accessToken: 'signed.jwt.token',
        refreshToken: 'signed.jwt.token',
        tokenType: 'Bearer',
        expiresIn: ACCESS_TOKEN_EXPIRES_SEC,
        userId: '42',
        mustChangePassword: true,
      });

      // sensitive fields must not leak
      expect(result).not.toHaveProperty('passwordHash');

      // refresh token stored under the per-user key with sliding TTL
      expect(redis.set).toHaveBeenCalledWith(
        'refresh:42',
        expect.any(String),
        'EX',
        REFRESH_SLIDING_DAYS * DAY_SEC,
      );
    });

    it('sets mustChangePassword to false when the password was already changed', async () => {
      const passwordHash = await argon2.hash('correct-password');
      usersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'a@a.com',
        passwordHash,
        role: UserRole.BRANCH_MANAGER,
        passwordUpdatedAt: new Date(),
      });

      const result = await service.login('a@a.com', 'correct-password');

      expect(result.mustChangePassword).toBe(false);
    });

    it('stores a refresh payload containing a hash, absolute expiry, and role', async () => {
      const passwordHash = await argon2.hash('correct-password');
      usersService.findByEmail.mockResolvedValue({
        id: '7',
        email: 'a@a.com',
        passwordHash,
        role: UserRole.WAREHOUSE_MANAGER,
        passwordUpdatedAt: new Date(),
      });

      const before = Date.now();
      await service.login('a@a.com', 'correct-password');

      const storedRaw = redis.set.mock.calls[0][1] as string;
      const stored = JSON.parse(storedRaw) as {
        tokenHash: string;
        absoluteExpiresAt: number;
        role: string;
      };

      // refresh token is hashed, not stored in plaintext
      expect(stored.tokenHash).not.toBe('signed.jwt.token');
      expect(stored.role).toBe(UserRole.WAREHOUSE_MANAGER);
      // absolute expiry is roughly login time + 90 days
      const expectedAbsolute = before + REFRESH_ABSOLUTE_DAYS * DAY_SEC * 1000;
      expect(stored.absoluteExpiresAt).toBeGreaterThanOrEqual(
        expectedAbsolute - 5000,
      );
      expect(stored.absoluteExpiresAt).toBeLessThanOrEqual(
        expectedAbsolute + 5000,
      );
    });
  });

  describe('refresh', () => {
    it('throws when no stored token exists', async () => {
      redis.get.mockResolvedValue(null);
      await expect(service.refresh('some-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('revokes and throws when the presented token does not match the stored hash', async () => {
      const tokenHash = await argon2.hash('the-real-token');
      redis.get.mockResolvedValue(
        JSON.stringify({
          tokenHash,
          absoluteExpiresAt: Date.now() + 1_000_000,
          role: UserRole.SUPER_ADMIN,
        }),
      );
      await expect(service.refresh('a-forged-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(redis.del).toHaveBeenCalledWith('refresh:1');
    });

    it('rotates tokens on a valid refresh', async () => {
      const token = 'the-real-token';
      const tokenHash = await argon2.hash(token);
      redis.get.mockResolvedValue(
        JSON.stringify({
          tokenHash,
          absoluteExpiresAt: Date.now() + 1_000_000,
          role: UserRole.SUPER_ADMIN,
        }),
      );
      const result = await service.refresh(token);
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.refreshToken).toBe('signed.jwt.token');
      expect(redis.set).toHaveBeenCalledWith(
        'refresh:1',
        expect.any(String),
        'EX',
        REFRESH_SLIDING_DAYS * DAY_SEC,
      );
    });

    it('throws when the refresh token is invalid (verify fails)', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });
      await expect(service.refresh('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('deletes the refresh token for the user', async () => {
      await service.logout('99');
      expect(redis.del).toHaveBeenCalledWith('refresh:99');
    });
  });
});
