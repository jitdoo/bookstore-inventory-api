import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PublishersService } from './publishers.service';
import { Publisher } from './entities/publisher.entity';
import { SortDirection } from '../common/dto/pagination-query.dto';
import {
  PublisherSearchField,
  PublisherSortField,
} from './dto/publisher-query.dto';

describe('PublishersService', () => {
  let service: PublishersService;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    findAndCount: jest.Mock;
    softRemove: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      softRemove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PublishersService,
        { provide: getRepositoryToken(Publisher), useValue: repo },
      ],
    }).compile();

    service = moduleRef.get(PublishersService);
  });

  describe('create', () => {
    it('throws when the business number already exists', async () => {
      repo.findOne.mockResolvedValue({ id: '1' });
      await expect(
        service.create({ name: 'A', businessNumber: '123' }),
      ).rejects.toThrow(ConflictException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('creates a publisher when the business number is unique', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue({ name: 'A', businessNumber: '123' });
      repo.save.mockResolvedValue({
        id: '1',
        name: 'A',
        businessNumber: '123',
      });

      const result = await service.create({ name: 'A', businessNumber: '123' });
      expect(result).toEqual({ id: '1' });
      expect(repo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('throws when the publisher is not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update('99', { name: 'New' })).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('updates and returns nothing', async () => {
      const publisher = { id: '1', name: 'Old', businessNumber: '123' };
      repo.findOne.mockResolvedValue(publisher);
      repo.save.mockResolvedValue(publisher);

      const result = await service.update('1', { name: 'New' });

      expect(result).toBeUndefined(); // void
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('checks uniqueness when the business number changes', async () => {
      const publisher = { id: '1', name: 'A', businessNumber: '123' };
      // findOne: first the target publisher, then the uniqueness check
      repo.findOne
        .mockResolvedValueOnce(publisher) // findOne(id)
        .mockResolvedValueOnce({ id: '2' }); // ensureBusinessNumberUnique finds a conflict

      await expect(
        service.update('1', { businessNumber: '999' }),
      ).rejects.toThrow(ConflictException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns paginated data with meta', async () => {
      repo.findAndCount.mockResolvedValue([[{ id: '1' }, { id: '2' }], 25]);

      const result = await service.findAll({
        page: 1,
        limit: 20,
        sortBy: PublisherSortField.NAME,
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
      repo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 20,
        search: 'A',
        searchField: PublisherSearchField.NAME,
        sortBy: PublisherSortField.NAME,
        sortDirection: SortDirection.ASC,
      });

      const callArg = repo.findAndCount.mock.calls[0][0];
      expect(callArg.where).toHaveProperty('name');
      expect(callArg.order).toEqual({ name: 'ASC' });
      expect(callArg.skip).toBe(0);
      expect(callArg.take).toBe(20);
    });

    it('does not apply a filter when the keyword is missing', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 2,
        limit: 10,
        sortBy: PublisherSortField.NAME,
        sortDirection: SortDirection.DESC,
      });

      const callArg = repo.findAndCount.mock.calls[0][0];
      expect(callArg.where).toEqual({});
      expect(callArg.skip).toBe(10); // (page 2 - 1) * limit 10
      expect(callArg.take).toBe(10);
      expect(callArg.order).toEqual({ name: 'DESC' });
    });
  });

  describe('findOne', () => {
    it('throws when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('99')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft removes an existing publisher', async () => {
      const publisher = { id: '1', name: 'A' };
      repo.findOne.mockResolvedValue(publisher);

      await service.remove('1');
      expect(repo.softRemove).toHaveBeenCalledWith(publisher);
    });
  });
});
