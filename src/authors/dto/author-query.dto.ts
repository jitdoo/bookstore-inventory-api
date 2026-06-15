import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export enum AuthorSearchField {
  NAME = 'name',
}

export enum AuthorSortField {
  NAME = 'name',
  CREATED_AT = 'createdAt',
}

export class AuthorQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AuthorSearchField })
  @IsOptional()
  @IsEnum(AuthorSearchField)
  searchField?: AuthorSearchField;

  @ApiPropertyOptional({
    description: 'Search keyword (used with searchField)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: AuthorSortField,
    default: AuthorSortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(AuthorSortField)
  sortBy: AuthorSortField = AuthorSortField.CREATED_AT;
}
