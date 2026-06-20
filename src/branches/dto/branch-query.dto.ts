import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export enum BranchSearchField {
  NAME = 'name',
  CODE = 'code',
}

export enum BranchSortField {
  NAME = 'name',
  OPEN_DATE = 'openDate',
}

export class BranchQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BranchSearchField })
  @IsOptional()
  @IsEnum(BranchSearchField)
  searchField?: BranchSearchField;

  @ApiPropertyOptional({
    description: 'Search keyword (used with searchField)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: BranchSortField,
    default: BranchSortField.OPEN_DATE,
  })
  @IsOptional()
  @IsEnum(BranchSortField)
  sortBy: BranchSortField = BranchSortField.OPEN_DATE;
}
