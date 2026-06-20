import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { Branch } from './entities/branch.entity';
import { SortDirection } from '../common/dto/pagination-query.dto';
import { BranchSearchField, BranchSortField } from './dto/branch-query.dto';
import { User } from '../users/entities/user.entity';

describe('BranchesService', () => {
  let service: BranchesService;
  let branchRepo: any;
  let userRepo: any;

  beforeEach(async () => {
    branchRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      softRemove: jest.fn(),
    };
    userRepo = {
      findOne: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BranchesService,
        { provide: getRepositoryToken(Branch), useValue: branchRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = moduleRef.get(BranchesService);
  });

  describe('create', () => {
    it('throws when the code already exists', async () => {
      branchRepo.findOne.mockResolvedValue({ id: '1' });
      await expect(service.create({ name: 'A', code: '123' })).rejects.toThrow(
        ConflictException,
      );
      expect(branchRepo.save).not.toHaveBeenCalled();
    });

    it('creates a branch when the code is unique', async () => {
      branchRepo.findOne.mockResolvedValue(null);
      branchRepo.create.mockReturnValue({ name: 'A', code: '123' });
      branchRepo.save.mockResolvedValue({
        id: '1',
        name: 'A',
        code: '123',
      });

      const result = await service.create({ name: 'A', code: '123' });
      expect(result).toEqual({ id: '1' });
      expect(branchRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('throws when the branch is not found', async () => {
      branchRepo.findOne.mockResolvedValue(null);
      await expect(service.update('99', { name: 'New' })).rejects.toThrow(
        NotFoundException,
      );
      expect(branchRepo.save).not.toHaveBeenCalled();
    });

    it('updates and returns nothing', async () => {
      const branch = { id: '1', name: 'Old', code: '123' };
      branchRepo.findOne.mockResolvedValue(branch);
      branchRepo.save.mockResolvedValue(branch);

      const result = await service.update('1', { name: 'New' });

      expect(result).toBeUndefined(); // void
      expect(branchRepo.save).toHaveBeenCalledTimes(1);
    });

    it('checks uniqueness when the code changes', async () => {
      const branch = { id: '1', name: 'A', code: '123' };
      branchRepo.findOne
        .mockResolvedValueOnce(branch)
        .mockResolvedValueOnce({ id: '2' });

      await expect(service.update('1', { code: '999' })).rejects.toThrow(
        ConflictException,
      );
      expect(branchRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns paginated data with meta', async () => {
      branchRepo.findAndCount.mockResolvedValue([
        [{ id: '1' }, { id: '2' }],
        25,
      ]);

      const result = await service.findAll({
        page: 1,
        limit: 20,
        sortBy: BranchSortField.NAME,
        sortDirection: SortDirection.DESC,
      });

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        totalCount: 25,
        totalPages: 2,
        currentPage: 1,
        perPage: 20,
      });
    });

    it('applies a search filter when field and keyword are provided', async () => {
      branchRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 20,
        search: 'A',
        searchField: BranchSearchField.NAME,
        sortBy: BranchSortField.NAME,
        sortDirection: SortDirection.ASC,
      });

      const callArg = branchRepo.findAndCount.mock.calls[0][0];
      expect(callArg.where).toHaveProperty('name');
      expect(callArg.order).toEqual({ name: 'ASC' });
      expect(callArg.skip).toBe(0);
      expect(callArg.take).toBe(20);
    });

    it('does not apply a filter when the keyword is missing', async () => {
      branchRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 2,
        limit: 10,
        sortBy: BranchSortField.NAME,
        sortDirection: SortDirection.DESC,
      });

      const callArg = branchRepo.findAndCount.mock.calls[0][0];
      expect(callArg.where).toEqual({});
      expect(callArg.skip).toBe(10); // (page 2 - 1) * limit 10
      expect(callArg.take).toBe(10);
      expect(callArg.order).toEqual({ name: 'DESC' });
    });
  });

  describe('findOne', () => {
    it('throws when not found', async () => {
      branchRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('99')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft removes an existing branch', async () => {
      const branch = { id: '1', name: 'A' };
      branchRepo.findOne.mockResolvedValue(branch);

      await service.remove('1');
      expect(branchRepo.softRemove).toHaveBeenCalledWith(branch);
    });
  });
});
