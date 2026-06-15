import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  IsNotEmpty,
  IsISO31661Alpha3,
} from 'class-validator';

export class CreateAuthorDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: '1990-01-01' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ example: 'KOR' })
  @IsOptional()
  @IsISO31661Alpha3()
  countryCode?: string;
}
