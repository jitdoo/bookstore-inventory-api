import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';
import { AuthorsService } from './authors.service';
import { AuthorQueryDto } from './dto/author-query.dto';

@ApiTags('authors')
@ApiBearerAuth()
@Controller('authors')
export class AuthorsController {
  constructor(private readonly authorsService: AuthorsService) {}

  @Get()
  @ApiOperation({ summary: 'List authors (paginated, searchable by name)' })
  findAll(@Query() query: AuthorQueryDto) {
    return this.authorsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a author by id' })
  findOne(@Param('id') id: string) {
    return this.authorsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a author (SUPER_ADMIN only)' })
  @ApiResponse({ status: 201, schema: { example: { id: '1' } } })
  create(@Body() dto: CreateAuthorDto) {
    return this.authorsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a author (SUPER_ADMIN only)' })
  update(@Param('id') id: string, @Body() dto: UpdateAuthorDto) {
    return this.authorsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a author (SUPER_ADMIN only)' })
  remove(@Param('id') id: string) {
    return this.authorsService.remove(id);
  }
}
