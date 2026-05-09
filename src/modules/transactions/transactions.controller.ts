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

const uuidPipe = new ParseUUIDPipe({ version: '4' });

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(
    @UserId() userId: string,
    @Body() createTransactionDto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(userId, createTransactionDto);
  }

  @Get()
  findAll(@UserId() userId: string) {
    return this.transactionsService.findAllByUser(userId);
  }

  @Get(':id')
  findOne(@Param('id', uuidPipe) id: string, @UserId() userId: string) {
    return this.transactionsService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id', uuidPipe) id: string,
    @UserId() userId: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(id, userId, updateTransactionDto);
  }

  @Delete(':id')
  remove(@Param('id', uuidPipe) id: string, @UserId() userId: string) {
    return this.transactionsService.remove(id, userId);
  }
}
