import {
  Inject,
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import {
  buildPaginatedResponse,
  PaginatedResponse,
} from '../common/dto/paginated-response';
import { Branch } from '../branches/entities/branch.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { User, UserRole } from './entities/user.entity';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

type Requester = { role: UserRole; branchId: string | null };

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async create(
    dto: CreateUserDto,
    requester: Requester,
  ): Promise<{ id: string }> {
    // Only allow SUPER_ADMIN or BRANCH_MANAGER to create users
    this.assertCanManageUsers(requester.role);
    this.assertManagerScope(requester, {
      role: dto.role,
      branchId: dto.branchId ?? null,
    });

    // Validate role and branchId requirements
    if (dto.role === UserRole.BRANCH_MANAGER && !dto.branchId) {
      throw new BadRequestException(
        'Branch ID is required for branch managers',
      );
    }
    if (dto.role === UserRole.BRANCH_STAFF && !dto.branchId) {
      throw new BadRequestException('Branch ID is required for branch staff');
    }

    // Ensure email is unique and branch exists
    await this.ensureEmailUnique(dto.email);
    if (dto.branchId) {
      await this.ensureBranchExists(dto.branchId);
    }
    if (dto.role === UserRole.BRANCH_MANAGER && dto.branchId) {
      await this.ensureNoExistingManager(dto.branchId);
    }

    // Hash the default password for new users
    const initialPassword = this.configService.getOrThrow<string>(
      'DEFAULT_USER_PASSWORD',
    );
    const passwordHash = await argon2.hash(initialPassword);

    // Create and save the new user
    const newUser = this.userRepository.create({
      email: dto.email,
      name: dto.name,
      role: dto.role,
      branchId: dto.branchId ?? null,
      passwordHash,
    });
    const saved = await this.userRepository.save(newUser);
    return { id: saved.id };
  }

  async findAll(
    query: UserQueryDto,
    requester: Requester,
  ): Promise<PaginatedResponse<User>> {
    const {
      page,
      limit,
      search,
      searchField,
      sortBy,
      sortDirection,
      branchId,
      role,
    } = query;

    const where: FindOptionsWhere<User> = {};

    // Search only when both field and keyword are provided
    if (search && searchField) {
      where[searchField] = ILike(`%${search}%`);
    }

    // Restrict results based on requester role and branch
    if (requester.role === UserRole.BRANCH_MANAGER) {
      where.branchId = requester.branchId ?? undefined;
    } else if (branchId) {
      where.branchId = branchId;
    }

    if (role) {
      where.role = role;
    }

    const [data, totalCount] = await this.userRepository.findAndCount({
      where,
      relations: ['branch'],
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
        branch: { id: true, name: true, code: true },
      },
      order: { [sortBy]: sortDirection },
      skip: (page - 1) * limit,
      take: limit,
    });
    return buildPaginatedResponse(data, totalCount, page, limit);
  }

  async findOne(id: string, requester: Requester): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['branch'],
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
        branch: { id: true, name: true, code: true },
      },
    });

    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    this.assertManagerScope(requester, user);

    return user;
  }

  async update(
    id: string,
    updates: Partial<User>,
    requester: Requester,
  ): Promise<void> {
    // Only allow SUPER_ADMIN or BRANCH_MANAGER to update users
    this.assertCanManageUsers(requester.role);
    const user = await this.findUserOrFail(id);
    this.assertManagerScope(requester, user);

    Object.assign(user, updates);
    await this.userRepository.save(user);
  }

  async remove(id: string, requester: Requester): Promise<void> {
    this.assertCanManageUsers(requester.role);
    const user = await this.findUserOrFail(id);
    this.assertManagerScope(requester, user);

    await this.userRepository.softDelete(id);
    await this.redis.del(`refresh:${id}`);
  }

  async getProfile(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
      relations: ['branch'],
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
        branch: { id: true, name: true, code: true },
      },
    });
  }

  async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    return this.userRepository.save({ id: userId, ...updates });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.userRepository.update(userId, {
      passwordHash,
      passwordUpdatedAt: new Date(),
    });
  }

  private async findUserOrFail(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  private async ensureNoExistingManager(branchId: string | null) {
    if (!branchId) {
      throw new BadRequestException(
        'Branch ID is required for branch managers',
      );
    }

    const existingManager = await this.userRepository.findOne({
      where: { branchId, role: UserRole.BRANCH_MANAGER },
    });
    if (existingManager) {
      throw new ConflictException(`Branch already has a branch manager`);
    }
  }

  private async ensureBranchExists(branchId: string): Promise<void> {
    const branch = await this.branchRepository.findOne({
      where: { id: branchId },
    });

    if (!branch) {
      throw new BadRequestException(`Branch does not exist`);
    }
  }

  private async ensureEmailUnique(email: string): Promise<void> {
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ConflictException(`Email ${email} is already in use`);
    }
  }

  private assertCanManageUsers(role: UserRole) {
    if (role !== UserRole.SUPER_ADMIN && role !== UserRole.BRANCH_MANAGER) {
      throw new ForbiddenException(
        'Only SUPER_ADMIN or BRANCH_MANAGER can manage users',
      );
    }
  }

  private assertManagerScope(
    requester: Requester,
    target: { role: UserRole; branchId: string | null },
  ) {
    if (requester.role === UserRole.BRANCH_MANAGER) {
      if (target.role !== UserRole.BRANCH_STAFF) {
        throw new ForbiddenException('A branch manager can only manage staff');
      }
      if (target.branchId !== requester.branchId) {
        throw new ForbiddenException(
          'A branch manager can only manage staff in their own branch',
        );
      }
    }
  }
}
