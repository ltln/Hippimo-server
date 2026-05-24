import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
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
import { Transaction } from './entities/transaction.entity';

const uuidPipe = new ParseUUIDPipe({ version: '4' });

@ApiTags('Transactions')
@ApiBearerAuth('access-token')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a transaction for current user',
    description:
      'Creates an income, expense, or transfer transaction and applies wallet balance changes.',
  })
  @ApiCreatedResponse({
    description: 'Transaction created successfully.',
    type: Transaction,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid transaction payload, missing required category or destination wallet, or incompatible category type.',
  })
  @ApiNotFoundResponse({
    description: 'Wallet, category, or AI suggested category was not found.',
  })
  create(
    @UserId() userId: string,
    @Body() createTransactionDto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(userId, createTransactionDto);
  }

  @Get()
  @ApiOperation({ summary: 'List transactions for current user' })
  @ApiOkResponse({
    description: 'Transactions returned successfully.',
    type: Transaction,
    isArray: true,
  })
  findAll(@UserId() userId: string) {
    return this.transactionsService.findAllByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction by id' })
  @ApiParam({
    name: 'id',
    description: 'Transaction UUID.',
    format: 'uuid',
    example: '4b7a85ce-5fc3-4ed2-b26f-49a3d2ed9c2d',
  })
  @ApiOkResponse({
    description: 'Transaction returned successfully.',
    type: Transaction,
  })
  @ApiNotFoundResponse({ description: 'Transaction not found.' })
  findOne(@Param('id', uuidPipe) id: string, @UserId() userId: string) {
    return this.transactionsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a transaction by id',
    description:
      'Updates transaction fields and reapplies wallet balance changes when amount, type, or wallets change.',
  })
  @ApiParam({
    name: 'id',
    description: 'Transaction UUID.',
    format: 'uuid',
    example: '4b7a85ce-5fc3-4ed2-b26f-49a3d2ed9c2d',
  })
  @ApiOkResponse({
    description: 'Transaction updated successfully.',
    type: Transaction,
  })
  @ApiBadRequestResponse({
    description:
      'No fields provided, invalid transaction payload, or incompatible category/type/wallet combination.',
  })
  @ApiNotFoundResponse({
    description: 'Transaction, wallet, or category not found.',
  })
  update(
    @Param('id', uuidPipe) id: string,
    @UserId() userId: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(id, userId, updateTransactionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a transaction by id' })
  @ApiParam({
    name: 'id',
    description: 'Transaction UUID.',
    format: 'uuid',
    example: '4b7a85ce-5fc3-4ed2-b26f-49a3d2ed9c2d',
  })
  @ApiOkResponse({
    description: 'Transaction deleted successfully.',
    schema: {
      example: {
        message: 'Transaction deleted successfully',
        transactionId: '4b7a85ce-5fc3-4ed2-b26f-49a3d2ed9c2d',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Transaction not found.' })
  remove(@Param('id', uuidPipe) id: string, @UserId() userId: string) {
    return this.transactionsService.remove(id, userId);
  }
}
