import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  IsNotEmpty,
  Matches,
} from 'class-validator';

export class CreateBranchDto {
  @ApiProperty()
  @IsString()
  @MaxLength(50)
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'BERLIN001' })
  @IsString()
  @MaxLength(30)
  @IsNotEmpty()
  code!: string;

  @ApiPropertyOptional({ example: '01012345678' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'Phone number must contain only digits' })
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: '06234' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'Zipcode must contain only digits' })
  @MaxLength(10)
  zipcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressDetail?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  open_date?: string;
}
