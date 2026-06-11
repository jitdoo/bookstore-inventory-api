import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export enum PublisherSearchField {
  NAME = 'name',
  BUSINESS_NUMBER = 'businessNumber',
}

export enum PublisherSortField {
  NAME = 'name',
  CREATED_AT = 'createdAt',
}

export class PublisherQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PublisherSearchField })
  @IsOptional()
  @IsEnum(PublisherSearchField)
  searchField?: PublisherSearchField;

  @ApiPropertyOptional({
    description: 'Search keyword (used with searchField)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: PublisherSortField,
    default: PublisherSortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(PublisherSortField)
  sortBy: PublisherSortField = PublisherSortField.CREATED_AT;
}
