import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsISBN,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateBookDto {
  @ApiProperty()
  @IsString()
  publisherId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(300)
  title!: string;

  @ApiProperty({ example: '9788936434120' })
  @IsISBN()
  isbn!: string;

  @ApiProperty({ example: '15000.00' })
  @IsNumberString()
  price!: string;

  @ApiPropertyOptional({ example: '2024-03-15' })
  @IsOptional()
  @IsDateString()
  publishedDate?: string;

  @ApiProperty({ type: [String], example: ['1', '2'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  authorIds!: string[];
}
