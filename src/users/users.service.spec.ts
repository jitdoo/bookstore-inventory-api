import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';
import { Branch } from '../branches/entities/branch.entity';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { SortDirection } from '../common/dto/pagination-query.dto';
import { UserSearchField, UserSortField } from './dto/user-query.dto';

jest.mock('argon2');

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: any;
  let branchRepo: any;
  let redis: any;
  let config: any;

  const SUPER = { role: UserRole.SUPER_ADMIN, branchId: null };
  const MANAGER = { role: UserRole.BRANCH_MANAGER, branchId: '10' };
  const STAFF = { role: UserRole.BRANCH_STAFF, branchId: '10' };

  beforeEach(async () => {
    userRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      softDelete: jest.fn(),
    };
    branchRepo = { findOne: jest.fn() };
    redis = { del: jest.fn() };
    config = { getOrThrow: jest.fn().mockReturnValue('Default1234!') };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Branch), useValue: branchRepo },
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
    (argon2.hash as jest.Mock).mockResolvedValue('hashed');
  });

  describe('create', () => {
    const baseDto = {
      email: 'new@test.com',
      name: 'New',
      role: UserRole.BRANCH_STAFF,
      branchId: '10',
    };

    it('lets SUPER_ADMIN create any role', async () => {
      userRepo.findOne.mockResolvedValue(null);
      branchRepo.findOne.mockResolvedValue({ id: '10' });
      userRepo.create.mockReturnValue({});
      userRepo.save.mockResolvedValue({ id: '1' });

      const result = await service.create(
        { ...baseDto, role: UserRole.BRANCH_MANAGER },
        SUPER,
      );
      expect(result).toEqual({ id: '1' });
    });

    it('lets BRANCH_MANAGER create staff in their own branch', async () => {
      userRepo.findOne.mockResolvedValue(null);
      branchRepo.findOne.mockResolvedValue({ id: '10' });
      userRepo.create.mockReturnValue({});
      userRepo.save.mockResolvedValue({ id: '2' });

      const result = await service.create(baseDto, MANAGER);
      expect(result).toEqual({ id: '2' });
    });

    it('forbids BRANCH_MANAGER from creating a non-staff role', async () => {
      await expect(
        service.create({ ...baseDto, role: UserRole.BRANCH_MANAGER }, MANAGER),
      ).rejects.toThrow(ForbiddenException);
      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('forbids BRANCH_MANAGER from creating staff in another branch', async () => {
      await expect(
        service.create({ ...baseDto, branchId: '99' }, MANAGER),
      ).rejects.toThrow(ForbiddenException);
      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('forbids BRANCH_STAFF from creating users', async () => {
      await expect(service.create(baseDto, STAFF)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects a duplicate email', async () => {
      userRepo.findOne.mockResolvedValue({ id: '1' }); // email taken
      await expect(service.create(baseDto, SUPER)).rejects.toThrow(
        ConflictException,
      );
      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('rejects a non-existent branch', async () => {
      userRepo.findOne.mockResolvedValue(null);
      branchRepo.findOne.mockResolvedValue(null);
      await expect(service.create(baseDto, SUPER)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a second manager in the same branch', async () => {
      userRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: '5' });
      branchRepo.findOne.mockResolvedValue({ id: '10' });
      await expect(
        service.create({ ...baseDto, role: UserRole.BRANCH_MANAGER }, SUPER),
      ).rejects.toThrow(ConflictException);
    });

    it('hashes the default password from config', async () => {
      userRepo.findOne.mockResolvedValue(null);
      branchRepo.findOne.mockResolvedValue({ id: '10' });
      userRepo.create.mockReturnValue({});
      userRepo.save.mockResolvedValue({ id: '1' });

      await service.create(baseDto, SUPER);
      expect(config.getOrThrow).toHaveBeenCalledWith('DEFAULT_USER_PASSWORD');
      expect(argon2.hash).toHaveBeenCalledWith('Default1234!');
    });
  });

  describe('findAll', () => {
    const query = {
      page: 1,
      limit: 20,
      sortBy: UserSortField.CREATED_AT,
      sortDirection: SortDirection.DESC,
    };

    it('scopes a BRANCH_MANAGER to their own branch', async () => {
      userRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll(query, MANAGER);

      const arg = userRepo.findAndCount.mock.calls[0][0];
      expect(arg.where.branchId).toBe('10');
    });

    it('lets SUPER_ADMIN filter by a given branchId', async () => {
      userRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll({ ...query, branchId: '7' }, SUPER);

      const arg = userRepo.findAndCount.mock.calls[0][0];
      expect(arg.where.branchId).toBe('7');
    });

    it('does not filter by branch when SUPER_ADMIN gives none', async () => {
      userRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll(query, SUPER);

      const arg = userRepo.findAndCount.mock.calls[0][0];
      expect(arg.where.branchId).toBeUndefined();
    });

    it('excludes passwordHash from the selected fields', async () => {
      userRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll(query, SUPER);

      const arg = userRepo.findAndCount.mock.calls[0][0];
      expect(arg.select.passwordHash).toBeUndefined();
      expect(arg.select.branch).toEqual({ id: true, name: true, code: true });
      expect(arg.relations).toEqual(['branch']);
    });

    it('applies search on the chosen field', async () => {
      userRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll(
        { ...query, search: 'kim', searchField: UserSearchField.NAME },
        SUPER,
      );

      const arg = userRepo.findAndCount.mock.calls[0][0];
      expect(arg.where).toHaveProperty('name');
    });
  });

  describe('findOne', () => {
    it('throws when not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('99', SUPER)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('loads branch and excludes passwordHash', async () => {
      userRepo.findOne.mockResolvedValue({ id: '1' });
      await service.findOne('1', SUPER);

      const arg = userRepo.findOne.mock.calls[0][0];
      expect(arg.relations).toEqual(['branch']);
      expect(arg.select.passwordHash).toBeUndefined();
    });
  });

  describe('update', () => {
    it('forbids BRANCH_STAFF from updating', async () => {
      await expect(service.update('1', { name: 'X' }, STAFF)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws when the target user is missing', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.update('99', { name: 'X' }, SUPER)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('forbids a manager from updating staff in another branch', async () => {
      userRepo.findOne.mockResolvedValue({
        id: '1',
        role: UserRole.BRANCH_STAFF,
        branchId: '99',
      });
      await expect(service.update('1', { name: 'X' }, MANAGER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('updates name for an in-scope staff', async () => {
      const user = {
        id: '1',
        role: UserRole.BRANCH_STAFF,
        branchId: '10',
        name: 'Old',
      };
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue(user);

      await service.update('1', { name: 'New' }, MANAGER);
      expect(user.name).toBe('New');
      expect(userRepo.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('soft-deletes and revokes the refresh session', async () => {
      userRepo.findOne.mockResolvedValue({
        id: '1',
        role: UserRole.BRANCH_STAFF,
        branchId: '10',
      });

      await service.remove('1', SUPER);
      expect(userRepo.softDelete).toHaveBeenCalledWith('1');
      expect(redis.del).toHaveBeenCalledWith('refresh:1');
    });

    it('forbids a manager from removing staff in another branch', async () => {
      userRepo.findOne.mockResolvedValue({
        id: '1',
        role: UserRole.BRANCH_STAFF,
        branchId: '99',
      });
      await expect(service.remove('1', MANAGER)).rejects.toThrow(
        ForbiddenException,
      );
      expect(userRepo.softDelete).not.toHaveBeenCalled();
    });
  });
});
