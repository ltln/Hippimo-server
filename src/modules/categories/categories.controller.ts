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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Category } from './entities/category.entity';

const uuidPipe = new ParseUUIDPipe({ version: '4' });

@ApiTags('Categories')
@ApiBearerAuth('access-token')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a category for current user' })
  @ApiCreatedResponse({
    description: 'Category created successfully.',
    type: Category,
  })
  @ApiBadRequestResponse({
    description: 'Invalid category payload or category name already exists.',
  })
  @ApiNotFoundResponse({ description: 'User not found.' })
  create(
    @UserId() userId: string,
    @Body() createCategoryDto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(userId, createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'List active categories of current user' })
  @ApiOkResponse({
    description: 'Active categories returned successfully.',
    type: Category,
    isArray: true,
  })
  @ApiNotFoundResponse({ description: 'User not found.' })
  findAll(@UserId() userId: string) {
    return this.categoriesService.findAllByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a category by id' })
  @ApiParam({
    name: 'id',
    description: 'Category UUID.',
    format: 'uuid',
    example: '4411b598-c7cd-4724-967d-1de2e31b0616',
  })
  @ApiOkResponse({
    description: 'Category returned successfully.',
    type: Category,
  })
  @ApiNotFoundResponse({ description: 'Category not found.' })
  findOne(@UserId() userId: string, @Param('id', uuidPipe) id: string) {
    return this.categoriesService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category by id' })
  @ApiParam({
    name: 'id',
    description: 'Category UUID.',
    format: 'uuid',
    example: '4411b598-c7cd-4724-967d-1de2e31b0616',
  })
  @ApiOkResponse({
    description: 'Category updated successfully.',
    type: Category,
  })
  @ApiBadRequestResponse({
    description:
      'No fields provided, invalid category payload, duplicate category name, or category type cannot be changed.',
  })
  @ApiNotFoundResponse({ description: 'Category not found.' })
  update(
    @UserId() userId: string,
    @Param('id', uuidPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, userId, updateCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category by id' })
  @ApiParam({
    name: 'id',
    description: 'Category UUID.',
    format: 'uuid',
    example: '4411b598-c7cd-4724-967d-1de2e31b0616',
  })
  @ApiOkResponse({
    description: 'Category deleted successfully.',
    schema: {
      example: {
        message: 'Category deleted successfully',
        categoryId: '4411b598-c7cd-4724-967d-1de2e31b0616',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Category not found.' })
  remove(@UserId() userId: string, @Param('id', uuidPipe) id: string) {
    return this.categoriesService.remove(id, userId);
  }
}
