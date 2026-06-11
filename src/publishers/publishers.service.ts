import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import {
  buildPaginatedResponse,
  PaginatedResponse,
} from '../common/dto/paginated-response';
import { PublisherQueryDto } from './dto/publisher-query.dto';
import { CreatePublisherDto } from './dto/create-publisher.dto';
import { UpdatePublisherDto } from './dto/update-publisher.dto';
import { Publisher } from './entities/publisher.entity';

@Injectable()
export class PublishersService {
  constructor(
    @InjectRepository(Publisher)
    private readonly publisherRepository: Repository<Publisher>,
  ) {}

  async create(dto: CreatePublisherDto): Promise<{ id: string }> {
    await this.ensureBusinessNumberUnique(dto.businessNumber);
    const publisher = this.publisherRepository.create(dto);
    const saved = await this.publisherRepository.save(publisher);
    return { id: saved.id };
  }

  async findAll(
    query: PublisherQueryDto,
  ): Promise<PaginatedResponse<Publisher>> {
    const { page, limit, search, searchField, sortBy, sortDirection } = query;

    // Search only when both field and keyword are provided
    const where =
      search && searchField ? { [searchField]: ILike(`%${search}%`) } : {};

    const [data, totalCount] = await this.publisherRepository.findAndCount({
      where,
      order: { [sortBy]: sortDirection },
      skip: (page - 1) * limit,
      take: limit,
    });
    return buildPaginatedResponse(data, totalCount, page, limit);
  }

  async findOne(id: string): Promise<Publisher> {
    const publisher = await this.publisherRepository.findOne({ where: { id } });
    if (!publisher) {
      throw new NotFoundException(`Publisher ${id} not found`);
    }
    return publisher;
  }

  async update(id: string, dto: UpdatePublisherDto): Promise<void> {
    const publisher = await this.findOne(id);
    if (dto.businessNumber && dto.businessNumber !== publisher.businessNumber) {
      await this.ensureBusinessNumberUnique(dto.businessNumber);
    }
    Object.assign(publisher, dto);
    await this.publisherRepository.save(publisher);
  }

  async remove(id: string): Promise<void> {
    const publisher = await this.findOne(id);
    await this.publisherRepository.softRemove(publisher);
  }

  private async ensureBusinessNumberUnique(
    businessNumber: string,
  ): Promise<void> {
    const existing = await this.publisherRepository.findOne({
      where: { businessNumber },
    });
    if (existing) {
      throw new ConflictException('Business number already exists');
    }
  }
}
