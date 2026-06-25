import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, IsOptional } from 'class-validator';

export class UpdateMyProfileDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name!: string;
}
