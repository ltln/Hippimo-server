import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UserId } from 'src/core/common/decorators/user-id.decorator';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

const uuidPipe = new ParseUUIDPipe({ version: '4' });

@ApiTags('Categories')
@ApiBearerAuth('access-token')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a category for current user' })
  @ApiOkResponse({ description: 'Category created successfully' })
  create(
    @UserId() userId: string,
    @Body() createCategoryDto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(userId, createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'List active categories of current user' })
  @ApiOkResponse({ description: 'Active categories returned successfully' })
  findAll(@UserId() userId: string) {
    return this.categoriesService.findAllByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a category by id' })
  @ApiOkResponse({ description: 'Category returned successfully' })
  findOne(@UserId() userId: string, @Param('id', uuidPipe) id: string) {
    return this.categoriesService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category by id' })
  @ApiOkResponse({ description: 'Category updated successfully' })
  update(
    @UserId() userId: string,
    @Param('id', uuidPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, userId, updateCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category by id' })
  @ApiOkResponse({ description: 'Category deleted successfully' })
  remove(@UserId() userId: string, @Param('id', uuidPipe) id: string) {
    return this.categoriesService.remove(id, userId);
  }
}
