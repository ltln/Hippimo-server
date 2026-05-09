import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UserId } from 'src/core/common/decorators/user-id.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(
    @UserId() userId: number,
    @Body() createCategoryDto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(userId, createCategoryDto);
  }

  @Get()
  findAll(@UserId() userId: number) {
    return this.categoriesService.findAllByUser(userId);
  }

  @Get(':id')
  findOne(@UserId() userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @UserId() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, userId, updateCategoryDto);
  }

  @Delete(':id')
  remove(@UserId() userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(id, userId);
  }
}
