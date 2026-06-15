import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AuthorsService } from './authors.service';
import { Author } from './entities/author.entity';
import { SortDirection } from '../common/dto/pagination-query.dto';
import { AuthorSortField, AuthorSearchField } from './dto/author-query.dto';

describe('AuthorsService', () => {
  let service: AuthorsService;
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
        AuthorsService,
        { provide: getRepositoryToken(Author), useValue: repo },
      ],
    }).compile();

    service = moduleRef.get(AuthorsService);
  });

  describe('create', () => {
    it('returns the new id', async () => {
      repo.create.mockReturnValue({ name: 'Hong Gil-dong' });
      repo.save.mockResolvedValue({ id: '1', name: 'Hong Gil-dong' });

      const result = await service.create({ name: 'Hong Gil-dong' });

      expect(result).toEqual({ id: '1' });
      expect(repo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('returns paginated data with meta', async () => {
      repo.findAndCount.mockResolvedValue([[{ id: '1' }, { id: '2' }], 25]);

      const result = await service.findAll({
        page: 1,
        limit: 20,
        sortBy: AuthorSortField.NAME,
        sortDirection: SortDirection.ASC,
      });

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        totalCount: 25,
        totalPages: 2,
        currentPage: 1,
        perPage: 20,
      });
    });

    it('applies a name search when a keyword is provided', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 20,
        searchField: AuthorSearchField.NAME,
        search: 'Hong',
        sortBy: AuthorSortField.NAME,
        sortDirection: SortDirection.ASC,
      });

      const callArg = repo.findAndCount.mock.calls[0][0];
      expect(callArg.where).toHaveProperty('name');
      expect(callArg.order).toEqual({ name: 'ASC' });
      expect(callArg.skip).toBe(0);
      expect(callArg.take).toBe(20);
    });

    it('does not filter when the keyword is missing', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 2,
        limit: 10,
        sortBy: AuthorSortField.NAME,
        sortDirection: SortDirection.ASC,
      });

      const callArg = repo.findAndCount.mock.calls[0][0];
      expect(callArg.where).toEqual({});
      expect(callArg.skip).toBe(10);
      expect(callArg.take).toBe(10);
    });
  });

  describe('findOne', () => {
    it('throws when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('99')).rejects.toThrow(NotFoundException);
    });

    it('returns the author when found', async () => {
      const author = { id: '1', name: 'Hong Gil-dong' };
      repo.findOne.mockResolvedValue(author);

      const result = await service.findOne('1');
      expect(result).toBe(author);
    });
  });

  describe('update', () => {
    it('throws when the author is not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update('99', { name: 'New' })).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('updates and returns nothing', async () => {
      const author = { id: '1', name: 'Old' };
      repo.findOne.mockResolvedValue(author);
      repo.save.mockResolvedValue(author);

      const result = await service.update('1', { name: 'New' });

      expect(result).toBeUndefined();
      expect(repo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('soft removes an existing author', async () => {
      const author = { id: '1', name: 'Hong Gil-dong' };
      repo.findOne.mockResolvedValue(author);

      await service.remove('1');
      expect(repo.softRemove).toHaveBeenCalledWith(author);
    });
  });
});
