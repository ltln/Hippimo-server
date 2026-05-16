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
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

const uuidPipe = new ParseUUIDPipe({ version: '4' });

@ApiTags('Budgets')
@ApiBearerAuth('access-token')
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a budget for current user' })
  @ApiOkResponse({ description: 'Budget created successfully' })
  create(@UserId() userId: string, @Body() createBudgetDto: CreateBudgetDto) {
    return this.budgetsService.create(userId, createBudgetDto);
  }

  @Get()
  @ApiOperation({ summary: 'List budgets for current user' })
  @ApiOkResponse({ description: 'Budgets returned successfully' })
  findAll(@UserId() userId: string, @Query() filters: ListBudgetsDto) {
    return this.budgetsService.findAllByUser(userId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a budget by id' })
  @ApiOkResponse({ description: 'Budget returned successfully' })
  findOne(@Param('id', uuidPipe) id: string, @UserId() userId: string) {
    return this.budgetsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a budget by id' })
  @ApiOkResponse({ description: 'Budget updated successfully' })
  update(
    @Param('id', uuidPipe) id: string,
    @UserId() userId: string,
    @Body() updateBudgetDto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(id, userId, updateBudgetDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a budget by id' })
  @ApiOkResponse({ description: 'Budget deleted successfully' })
  remove(@Param('id', uuidPipe) id: string, @UserId() userId: string) {
    return this.budgetsService.remove(id, userId);
  }
}
