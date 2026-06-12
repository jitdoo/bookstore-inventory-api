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
import { CreatePublisherDto } from './dto/create-publisher.dto';
import { UpdatePublisherDto } from './dto/update-publisher.dto';
import { PublishersService } from './publishers.service';
import { PublisherQueryDto } from './dto/publisher-query.dto';

@ApiTags('publishers')
@ApiBearerAuth()
@Controller('publishers')
export class PublishersController {
  constructor(private readonly publishersService: PublishersService) {}

  @Get()
  @ApiOperation({ summary: 'List publishers (paginated, searchable by name)' })
  findAll(@Query() query: PublisherQueryDto) {
    return this.publishersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a publisher by id' })
  findOne(@Param('id') id: string) {
    return this.publishersService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a publisher (SUPER_ADMIN only)' })
  @ApiResponse({ status: 201, schema: { example: { id: '1' } } })
  create(@Body() dto: CreatePublisherDto) {
    return this.publishersService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a publisher (SUPER_ADMIN only)' })
  update(@Param('id') id: string, @Body() dto: UpdatePublisherDto) {
    return this.publishersService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a publisher (SUPER_ADMIN only)' })
  remove(@Param('id') id: string) {
    return this.publishersService.remove(id);
  }
}
