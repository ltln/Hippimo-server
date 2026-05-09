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
import { WalletsService } from './wallets.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { AddMoneyToWalletDto } from './dto/add-money-to-wallet.dto';
import { UserId } from 'src/core/common/decorators/user-id.decorator';

const uuidPipe = new ParseUUIDPipe({ version: '4' });

@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  create(@UserId() userId: string, @Body() createWalletDto: CreateWalletDto) {
    return this.walletsService.create(userId, createWalletDto);
  }

  @Get()
  findAllByUser(@UserId() userId: string) {
    return this.walletsService.findAllByUser(userId);
  }

  @Get(':id')
  findOne(@Param('id', uuidPipe) id: string, @UserId() userId: string) {
    return this.walletsService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id', uuidPipe) id: string,
    @UserId() userId: string,
    @Body() updateWalletDto: UpdateWalletDto,
  ) {
    return this.walletsService.update(id, userId, updateWalletDto);
  }

  @Patch(':id/add-money')
  addMoney(
    @Param('id', uuidPipe) id: string,
    @UserId() userId: string,
    @Body() addMoneyToWalletDto: AddMoneyToWalletDto,
  ) {
    return this.walletsService.addMoney(id, userId, addMoneyToWalletDto);
  }

  @Delete(':id')
  remove(@Param('id', uuidPipe) id: string, @UserId() userId: string) {
    return this.walletsService.remove(id, userId);
  }
}
