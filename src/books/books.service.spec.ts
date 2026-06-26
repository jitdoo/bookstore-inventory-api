import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BooksService } from './books.service';
import { Book } from './entities/book.entity';
import { Publisher } from '../publishers/entities/publisher.entity';
import { Author } from '../authors/entities/author.entity';
import { SortDirection } from '../common/dto/pagination-query.dto';
import {
  BookQueryDto,
  BookSearchField,
  BookSortField,
} from './dto/book-query.dto';

describe('BooksService', () => {
  let service: BooksService;
  let bookRepo: any;
  let publisherRepo: any;
  let authorRepo: any;

  beforeEach(async () => {
    bookRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      softRemove: jest.fn(),
    };
    publisherRepo = { findOne: jest.fn() };
    authorRepo = { find: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BooksService,
        { provide: getRepositoryToken(Book), useValue: bookRepo },
        { provide: getRepositoryToken(Publisher), useValue: publisherRepo },
        { provide: getRepositoryToken(Author), useValue: authorRepo },
      ],
    }).compile();

    service = moduleRef.get(BooksService);
  });

  const validDto = {
    publisherId: '1',
    title: 'Book',
    isbn: '9788936434120',
    price: '15000.00',
    authorIds: ['1', '2'],
  };

  describe('create', () => {
    it('throws when the isbn already exists', async () => {
      bookRepo.findOne.mockResolvedValue({ id: '1' });
      await expect(service.create(validDto)).rejects.toThrow(ConflictException);
      expect(bookRepo.save).not.toHaveBeenCalled();
    });

    it('throws when the publisher does not exist', async () => {
      bookRepo.findOne.mockResolvedValue(null); // isbn unique
      publisherRepo.findOne.mockResolvedValue(null); // publisher missing
      await expect(service.create(validDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(bookRepo.save).not.toHaveBeenCalled();
    });

    it('throws when some authors do not exist', async () => {
      bookRepo.findOne.mockResolvedValue(null);
      publisherRepo.findOne.mockResolvedValue({ id: '1' });
      authorRepo.find.mockResolvedValue([{ id: '1' }]); // requested 2, found 1
      await expect(service.create(validDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(bookRepo.save).not.toHaveBeenCalled();
    });

    it('creates a book and returns the id', async () => {
      bookRepo.findOne.mockResolvedValue(null);
      publisherRepo.findOne.mockResolvedValue({ id: '1' });
      authorRepo.find.mockResolvedValue([{ id: '1' }, { id: '2' }]);
      bookRepo.create.mockReturnValue({});
      bookRepo.save.mockResolvedValue({ id: '10' });

      const result = await service.create(validDto);
      expect(result).toEqual({ id: '10' });
      expect(bookRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    let service: BooksService;
    let bookRepo: any;
    let qb: any;

    const baseQuery: BookQueryDto = {
      page: 1,
      limit: 20,
      sortBy: BookSortField.PUBLISHED_DATE,
      sortDirection: SortDirection.DESC,
    };

    beforeEach(async () => {
      qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        whereInIds: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        clone: jest.fn(function (this: any) {
          return this;
        }),
        getRawMany: jest.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]),
        getRawOne: jest.fn().mockResolvedValue({ count: '2' }),
        getMany: jest.fn().mockResolvedValue([
          { id: '1', title: 'A' },
          { id: '2', title: 'B' },
        ]),
      };

      bookRepo = {
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          BooksService,
          { provide: getRepositoryToken(Book), useValue: bookRepo },
          {
            provide: getRepositoryToken(Publisher),
            useValue: { findOne: jest.fn() },
          },
          {
            provide: getRepositoryToken(Author),
            useValue: { find: jest.fn() },
          },
        ],
      }).compile();

      service = moduleRef.get(BooksService);
    });

    it('returns paginated data with meta', async () => {
      const result = await service.findAll(baseQuery);

      expect(result.data).toHaveLength(2);
      expect(result.meta.totalCount).toBe(2);
      expect(result.meta.currentPage).toBe(1);
    });

    it('runs a 2-step query: ids first, then full load', async () => {
      await service.findAll(baseQuery);

      expect(qb.getRawMany).toHaveBeenCalled();
      expect(qb.getRawOne).toHaveBeenCalled();
      expect(qb.getMany).toHaveBeenCalled();
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
        'book.publisher',
        'publisher',
      );
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
        'book.authors',
        'author',
      );
    });

    it('paginates the id query', async () => {
      await service.findAll({ ...baseQuery, page: 2, limit: 10 });
      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('applies search when field and keyword are given', async () => {
      await service.findAll({
        ...baseQuery,
        search: 'abc',
        searchField: BookSearchField.TITLE,
      });
      const calledWithSearch = qb.andWhere.mock.calls.some(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('ILIKE'),
      );
      expect(calledWithSearch).toBe(true);
    });

    it('does not apply search without a keyword', async () => {
      await service.findAll(baseQuery);
      const calledWithSearch = qb.andWhere.mock.calls.some(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('ILIKE'),
      );
      expect(calledWithSearch).toBe(false);
    });

    it('applies the publisher filter', async () => {
      await service.findAll({ ...baseQuery, publisherId: '5' });
      const calledWithPublisher = qb.andWhere.mock.calls.some(
        (c: any[]) =>
          typeof c[0] === 'string' &&
          c[0].includes('publisherId') &&
          c[1]?.publisherId === '5',
      );
      expect(calledWithPublisher).toBe(true);
    });

    it('applies the author filter via an EXISTS subquery', async () => {
      await service.findAll({ ...baseQuery, authorId: '7' });
      const calledWithAuthor = qb.andWhere.mock.calls.some(
        (c: any[]) =>
          typeof c[0] === 'string' &&
          c[0].includes('EXISTS') &&
          c[1]?.authorId === '7',
      );
      expect(calledWithAuthor).toBe(true);
    });

    it('returns an empty page without running step 2 when no ids match', async () => {
      qb.getRawMany.mockResolvedValue([]);
      qb.getRawOne.mockResolvedValue({ count: '0' });

      const result = await service.findAll(baseQuery);

      expect(result.data).toEqual([]);
      expect(result.meta.totalCount).toBe(0);
      expect(qb.getMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('throws when not found', async () => {
      bookRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('99')).rejects.toThrow(NotFoundException);
    });

    it('loads full relations without a select restriction (detail view)', async () => {
      bookRepo.findOne.mockResolvedValue({ id: '1' });

      await service.findOne('1');

      const callArg = bookRepo.findOne.mock.calls[0][0];
      expect(callArg.relations).toEqual(['publisher', 'authors']);
      expect(callArg.select).toBeUndefined();
    });
  });

  describe('update', () => {
    it('throws when the book is not found', async () => {
      bookRepo.findOne.mockResolvedValue(null);
      await expect(service.update('99', { title: 'New' })).rejects.toThrow(
        NotFoundException,
      );
      expect(bookRepo.save).not.toHaveBeenCalled();
    });

    it('replaces authors when authorIds is provided', async () => {
      const book = {
        id: '1',
        isbn: '111',
        publisherId: '1',
        authors: [{ id: '1' }],
      };
      bookRepo.findOne.mockResolvedValue(book);
      authorRepo.find.mockResolvedValue([{ id: '2' }, { id: '3' }]);
      bookRepo.save.mockResolvedValue(book);

      await service.update('1', { authorIds: ['2', '3'] });

      expect(book.authors).toEqual([{ id: '2' }, { id: '3' }]);
      expect(bookRepo.save).toHaveBeenCalledTimes(1);
    });

    it('rejects when an author in the new set does not exist', async () => {
      const book = {
        id: '1',
        isbn: '111',
        publisherId: '1',
        authors: [{ id: '1' }],
      };
      bookRepo.findOne.mockResolvedValue(book);
      authorRepo.find.mockResolvedValue([{ id: '2' }]);

      await expect(
        service.update('1', { authorIds: ['2', '99'] }),
      ).rejects.toThrow(BadRequestException);
      expect(bookRepo.save).not.toHaveBeenCalled();
    });

    it('keeps existing authors when authorIds is not provided', async () => {
      const book = {
        id: '1',
        isbn: '111',
        publisherId: '1',
        authors: [{ id: '1' }],
      };
      bookRepo.findOne.mockResolvedValue(book);
      bookRepo.save.mockResolvedValue(book);

      await service.update('1', { title: 'New Title' });

      expect(book.authors).toEqual([{ id: '1' }]);
      expect(authorRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('soft removes an existing book', async () => {
      const book = { id: '1' };
      bookRepo.findOne.mockResolvedValue(book);
      await service.remove('1');
      expect(bookRepo.softRemove).toHaveBeenCalledWith(book);
    });
  });
});
