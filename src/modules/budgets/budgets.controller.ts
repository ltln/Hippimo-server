import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { UserId } from 'src/core/common/decorators/user-id.decorator';
import { ListBudgetsDto } from './dto/list-budgets.dto';
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
import { Budget } from './entities/budget.entity';

const uuidPipe = new ParseUUIDPipe({ version: '4' });

@ApiTags('Budgets')
@ApiBearerAuth('access-token')
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a budget for current user' })
  @ApiCreatedResponse({
    description: 'Budget created successfully.',
    type: Budget,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid budget payload, non-expense category, invalid period start, or duplicate budget period.',
  })
  @ApiNotFoundResponse({ description: 'Category not found.' })
  create(@UserId() userId: string, @Body() createBudgetDto: CreateBudgetDto) {
    return this.budgetsService.create(userId, createBudgetDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List budgets for current user',
    description:
      'Optionally filter budgets by category, period type, and period start date.',
  })
  @ApiOkResponse({
    description: 'Budgets returned successfully.',
    type: Budget,
    isArray: true,
  })
  @ApiBadRequestResponse({ description: 'Invalid query filters.' })
  findAll(@UserId() userId: string, @Query() filters: ListBudgetsDto) {
    return this.budgetsService.findAllByUser(userId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a budget by id' })
  @ApiParam({
    name: 'id',
    description: 'Budget UUID.',
    format: 'uuid',
    example: 'ea235716-98e9-4c2f-99f4-1f7c906dd934',
  })
  @ApiOkResponse({
    description: 'Budget returned successfully.',
    type: Budget,
  })
  @ApiNotFoundResponse({ description: 'Budget not found.' })
  findOne(@Param('id', uuidPipe) id: string, @UserId() userId: string) {
    return this.budgetsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a budget by id' })
  @ApiParam({
    name: 'id',
    description: 'Budget UUID.',
    format: 'uuid',
    example: 'ea235716-98e9-4c2f-99f4-1f7c906dd934',
  })
  @ApiOkResponse({
    description: 'Budget updated successfully.',
    type: Budget,
  })
  @ApiBadRequestResponse({
    description:
      'No fields provided, invalid budget payload, non-expense category, invalid period start, or duplicate budget period.',
  })
  @ApiNotFoundResponse({
    description: 'Budget or category not found.',
  })
  update(
    @Param('id', uuidPipe) id: string,
    @UserId() userId: string,
    @Body() updateBudgetDto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(id, userId, updateBudgetDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a budget by id' })
  @ApiParam({
    name: 'id',
    description: 'Budget UUID.',
    format: 'uuid',
    example: 'ea235716-98e9-4c2f-99f4-1f7c906dd934',
  })
  @ApiOkResponse({
    description: 'Budget deleted successfully.',
    schema: {
      example: {
        message: 'Budget deleted successfully',
        budgetId: 'ea235716-98e9-4c2f-99f4-1f7c906dd934',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Budget not found.' })
  remove(@Param('id', uuidPipe) id: string, @UserId() userId: string) {
    return this.budgetsService.remove(id, userId);
  }
}
