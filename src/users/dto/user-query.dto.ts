import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UserRole } from '../entities/user.entity';

export enum UserSearchField {
  NAME = 'name',
  EMAIL = 'email',
}

export enum UserSortField {
  NAME = 'name',
  EMAIL = 'email',
  CREATED_AT = 'createdAt',
}

export class UserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: UserSearchField })
  @IsOptional()
  @IsEnum(UserSearchField)
  searchField?: UserSearchField;

  @ApiPropertyOptional({
    description: 'Search keyword (used with searchField)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: UserSortField,
    default: UserSortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(UserSortField)
  sortBy: UserSortField = UserSortField.CREATED_AT;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  userRole?: UserRole;
}
