import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export enum BookSearchField {
  TITLE = 'title',
  ISBN = 'isbn',
}

export enum BookSortField {
  TITLE = 'title',
  PUBLISHED_DATE = 'publishedDate',
}

export class BookQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BookSearchField })
  @IsOptional()
  @IsEnum(BookSearchField)
  searchField?: BookSearchField;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: BookSortField,
    default: BookSortField.PUBLISHED_DATE,
  })
  @IsOptional()
  @IsEnum(BookSortField)
  sortBy: BookSortField = BookSortField.PUBLISHED_DATE;

  @ApiPropertyOptional()
  @IsOptional()
  publisherId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  authorId?: string;
}
