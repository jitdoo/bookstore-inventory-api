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
import { BookSearchField, BookSortField } from './dto/book-query.dto';

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
    it('returns paginated data with relations loaded', async () => {
      bookRepo.findAndCount.mockResolvedValue([[{ id: '1' }], 1]);

      const result = await service.findAll({
        page: 1,
        limit: 20,
        sortBy: BookSortField.PUBLISHED_DATE,
        sortDirection: SortDirection.DESC,
      });

      const callArg = bookRepo.findAndCount.mock.calls[0][0];
      expect(callArg.relations).toEqual(['publisher', 'authors']);
      expect(callArg.order).toEqual({ publishedDate: 'DESC', title: 'ASC' });
      expect(result.meta.totalCount).toBe(1);
    });

    it('applies search when field and keyword are provided', async () => {
      bookRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll({
        page: 1,
        limit: 20,
        search: 'abc',
        searchField: BookSearchField.TITLE,
        sortBy: BookSortField.PUBLISHED_DATE,
        sortDirection: SortDirection.DESC,
      });
      const callArg = bookRepo.findAndCount.mock.calls[0][0];
      expect(callArg.where).toHaveProperty('title');
    });

    it('selects only id and name for relations (slim list response)', async () => {
      bookRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 20,
        sortBy: BookSortField.PUBLISHED_DATE,
        sortDirection: SortDirection.DESC,
      });

      const callArg = bookRepo.findAndCount.mock.calls[0][0];
      expect(callArg.select.publisher).toEqual({ id: true, name: true });
      expect(callArg.select.authors).toEqual({ id: true, name: true });
      expect(callArg.select.publisherId).toBeUndefined();
      expect(callArg.select.deletedAt).toBeUndefined();
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
