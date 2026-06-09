import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches } from 'class-validator';

const PASSWORD_REGEX =
  /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^a-zA-Z0-9])[\x21-\x7E]{8,}$/;

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({ example: 'Password123' })
  @IsNotEmpty()
  @Matches(PASSWORD_REGEX, {
    message:
      'Password must be at least 8 characters and include letters, numbers, and a special character',
  })
  newPassword!: string;
}
