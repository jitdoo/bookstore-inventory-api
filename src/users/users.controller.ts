import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UsersService } from './users.service';

interface Requester {
  userId: string;
  role: UserRole;
  branchId: string | null;
}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({
    summary:
      'Create a user (SUPER_ADMIN: anyone; BRANCH_MANAGER: staff in own branch)',
  })
  @ApiResponse({ status: 201, schema: { example: { id: '1' } } })
  create(@Body() dto: CreateUserDto, @Req() req: Request) {
    const requester = req.user as Requester;
    return this.usersService.create(dto, requester);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: 'List users (paginated, searchable)' })
  findAll(@Query() query: UserQueryDto, @Req() req: Request) {
    const requester = req.user as Requester;
    return this.usersService.findAll(query, requester);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get the current user profile' })
  getProfile(@Req() req: Request) {
    const requester = req.user as Requester;
    return this.usersService.getProfile(requester.userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the current user profile' })
  @HttpCode(HttpStatus.NO_CONTENT)
  updateProfile(@Body() dto: UpdateMyProfileDto, @Req() req: Request) {
    const requester = req.user as Requester;
    return this.usersService.updateProfile(requester.userId, dto);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Get a user by id' })
  findOne(@Param('id') id: string, @Req() req: Request) {
    const requester = req.user as Requester;
    return this.usersService.findOne(id, requester);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.BRANCH_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Update a user (SUPER_ADMIN: anyone; BRANCH_MANAGER: staff in own branch)',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
  ) {
    const requester = req.user as Requester;
    return this.usersService.update(id, dto, requester);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.BRANCH_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user (SUPER_ADMIN or BRANCH_MANAGER)' })
  remove(@Param('id') id: string, @Req() req: Request) {
    const requester = req.user as Requester;
    return this.usersService.remove(id, requester);
  }
}
