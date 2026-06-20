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
import { BranchQueryDto } from './dto/branch-query.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { Branch } from './entities/branch.entity';
import { User, UserRole } from '../users/entities/user.entity';

export interface BranchDetail extends Branch {
  manager: { id: string; name: string | null; email: string } | null;
}

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateBranchDto): Promise<{ id: string }> {
    await this.ensureCodeUnique(dto.code);
    const branch = this.branchRepository.create(dto);
    const saved = await this.branchRepository.save(branch);
    return { id: saved.id };
  }

  async findAll(query: BranchQueryDto): Promise<PaginatedResponse<Branch>> {
    const { page, limit, search, searchField, sortBy, sortDirection } = query;

    // Search only when both field and keyword are provided
    const where =
      search && searchField ? { [searchField]: ILike(`%${search}%`) } : {};

    const [data, totalCount] = await this.branchRepository.findAndCount({
      where,
      order: { [sortBy]: sortDirection },
      skip: (page - 1) * limit,
      take: limit,
    });
    return buildPaginatedResponse(data, totalCount, page, limit);
  }

  private async findBranchOrFail(id: string): Promise<Branch> {
    const branch = await this.branchRepository.findOne({ where: { id } });
    if (!branch) {
      throw new NotFoundException(`Branch ${id} not found`);
    }
    return branch;
  }

  async findOne(id: string): Promise<BranchDetail> {
    const branch = await this.findBranchOrFail(id);

    // Find the branch manager
    const manager = await this.userRepository.findOne({
      where: { branchId: id, role: UserRole.BRANCH_MANAGER },
      select: { id: true, name: true, email: true },
    });

    return {
      ...branch,
      manager: manager ?? null,
    };
  }

  async update(id: string, dto: UpdateBranchDto): Promise<void> {
    const branch = await this.findBranchOrFail(id);
    if (dto.code && dto.code !== branch.code) {
      await this.ensureCodeUnique(dto.code);
    }
    Object.assign(branch, dto);
    await this.branchRepository.save(branch);
  }

  async remove(id: string): Promise<void> {
    const branch = await this.findBranchOrFail(id);
    await this.branchRepository.softRemove(branch);
  }

  private async ensureCodeUnique(code: string): Promise<void> {
    const existing = await this.branchRepository.findOne({
      where: { code },
    });
    if (existing) {
      throw new ConflictException('Code already exists');
    }
  }
}
