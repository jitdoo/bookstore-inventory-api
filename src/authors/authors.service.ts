import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import {
  buildPaginatedResponse,
  PaginatedResponse,
} from '../common/dto/paginated-response';
import { AuthorQueryDto } from './dto/author-query.dto';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';
import { Author } from './entities/author.entity';

@Injectable()
export class AuthorsService {
  constructor(
    @InjectRepository(Author)
    private readonly authorRepository: Repository<Author>,
  ) {}

  async create(dto: CreateAuthorDto): Promise<{ id: string }> {
    const author = this.authorRepository.create(dto);
    const saved = await this.authorRepository.save(author);
    return { id: saved.id };
  }

  async findAll(query: AuthorQueryDto): Promise<PaginatedResponse<Author>> {
    const { page, limit, search, searchField, sortBy, sortDirection } = query;

    // Search only when both field and keyword are provided
    const where =
      search && searchField ? { [searchField]: ILike(`%${search}%`) } : {};

    const [data, totalCount] = await this.authorRepository.findAndCount({
      where,
      order: { [sortBy]: sortDirection },
      skip: (page - 1) * limit,
      take: limit,
    });
    return buildPaginatedResponse(data, totalCount, page, limit);
  }

  async findOne(id: string): Promise<Author> {
    const author = await this.authorRepository.findOne({ where: { id } });
    if (!author) {
      throw new NotFoundException(`Author ${id} not found`);
    }
    return author;
  }

  async update(id: string, dto: UpdateAuthorDto): Promise<void> {
    const author = await this.findOne(id);
    Object.assign(author, dto);
    await this.authorRepository.save(author);
  }

  async remove(id: string): Promise<void> {
    const author = await this.findOne(id);
    await this.authorRepository.softRemove(author);
  }
}
