import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import {
  buildPaginatedResponse,
  PaginatedResponse,
} from '../common/dto/paginated-response';
import { Publisher } from '../publishers/entities/publisher.entity';
import { Author } from '../authors/entities/author.entity';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { BookQueryDto } from './dto/book-query.dto';
import { Book } from './entities/book.entity';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(Publisher)
    private readonly publisherRepository: Repository<Publisher>,
    @InjectRepository(Author)
    private readonly authorRepository: Repository<Author>,
  ) {}

  async create(dto: CreateBookDto): Promise<{ id: string }> {
    // Validate related entities and uniqueness constraints
    await this.ensureIsbnUnique(dto.isbn);
    await this.ensurePublisherExists(dto.publisherId);
    const authors = await this.resolveAuthors(dto.authorIds);

    const book = this.bookRepository.create({
      publisherId: dto.publisherId,
      title: dto.title,
      isbn: dto.isbn,
      price: dto.price,
      publishedDate: dto.publishedDate ?? null,
      authors,
    });
    const saved = await this.bookRepository.save(book);
    return { id: saved.id };
  }

  async findAll(query: BookQueryDto): Promise<PaginatedResponse<Book>> {
    const { page, limit, search, searchField, sortBy, sortDirection } = query;
    const where =
      search && searchField ? { [searchField]: ILike(`%${search}%`) } : {};

    const [data, totalCount] = await this.bookRepository.findAndCount({
      where,
      relations: ['publisher', 'authors'],
      select: {
        id: true,
        title: true,
        isbn: true,
        price: true,
        publishedDate: true,
        createdAt: true,
        updatedAt: true,
        publisher: { id: true, name: true },
        authors: { id: true, name: true },
      },
      order: { [sortBy]: sortDirection, title: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return buildPaginatedResponse(data, totalCount, page, limit);
  }

  async findOne(id: string): Promise<Book> {
    const book = await this.bookRepository.findOne({
      where: { id },
      relations: ['publisher', 'authors'],
    });
    if (!book) {
      throw new NotFoundException(`Book ${id} not found`);
    }
    return book;
  }

  async update(id: string, dto: UpdateBookDto): Promise<void> {
    const book = await this.findOne(id);

    // Validate changes to related entities and uniqueness constraints
    if (dto.isbn && dto.isbn !== book.isbn) {
      await this.ensureIsbnUnique(dto.isbn);
    }
    if (dto.publisherId) {
      await this.ensurePublisherExists(dto.publisherId);
    }
    if (dto.authorIds) {
      book.authors = await this.resolveAuthors(dto.authorIds);
    }

    Object.assign(book, {
      publisherId: dto.publisherId ?? book.publisherId,
      title: dto.title ?? book.title,
      isbn: dto.isbn ?? book.isbn,
      price: dto.price ?? book.price,
      publishedDate: dto.publishedDate ?? book.publishedDate,
    });
    await this.bookRepository.save(book);
  }

  async remove(id: string): Promise<void> {
    const book = await this.findOne(id);
    await this.bookRepository.softRemove(book);
  }

  private async ensureIsbnUnique(isbn: string): Promise<void> {
    const existing = await this.bookRepository.findOne({ where: { isbn } });
    if (existing) {
      throw new ConflictException('ISBN already exists');
    }
  }

  private async ensurePublisherExists(publisherId: string): Promise<void> {
    const publisher = await this.publisherRepository.findOne({
      where: { id: publisherId },
    });
    if (!publisher) {
      throw new BadRequestException(`Publisher ${publisherId} does not exist`);
    }
  }

  private async resolveAuthors(authorIds: string[]): Promise<Author[]> {
    const authors = await this.authorRepository.find({
      where: { id: In(authorIds) },
    });
    if (authors.length !== authorIds.length) {
      throw new BadRequestException('One or more authors do not exist');
    }
    return authors;
  }
}
