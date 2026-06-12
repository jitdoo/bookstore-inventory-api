import { Body, Controller, Post, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from '../common/decorators/public.decorator';
import { AllowPasswordChange } from '../common/decorators/allow-password-change.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Log in and receive access and refresh tokens' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Rotate tokens using a valid refresh token' })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Patch('password')
  @ApiBearerAuth()
  @AllowPasswordChange()
  @ApiOperation({ summary: 'Change the current user password' })
  changePassword(@Body() dto: ChangePasswordDto, @Req() req: Request) {
    const user = req.user as { userId: string };
    return this.authService.changePassword(
      user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Post('logout')
  @ApiBearerAuth()
  @AllowPasswordChange()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Log out and revoke the refresh token' })
  logout(@Req() req: Request) {
    const user = req.user as { userId: string };
    return this.authService.logout(user.userId);
  }
}
