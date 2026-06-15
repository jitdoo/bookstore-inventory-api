import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  IsNotEmpty,
  Matches,
} from 'class-validator';

export class CreatePublisherDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  @Matches(/^\d+$/, { message: 'Business number must contain only digits' })
  @MaxLength(50)
  @IsNotEmpty()
  businessNumber!: string;

  @ApiPropertyOptional({ example: '01012345678' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'Phone number must contain only digits' })
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'example@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

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
  contractStartedAt?: string;

  @ApiPropertyOptional({ example: '2027-01-01' })
  @IsOptional()
  @IsDateString()
  contractEndedAt?: string;
}
