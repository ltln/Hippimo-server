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
import { Wallet } from './entities/wallet.entity';

const uuidPipe = new ParseUUIDPipe({ version: '4' });

@ApiTags('Wallets')
@ApiBearerAuth('access-token')
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a wallet for current user' })
  @ApiCreatedResponse({
    description: 'Wallet created successfully.',
    type: Wallet,
  })
  @ApiBadRequestResponse({ description: 'Invalid wallet payload.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  create(@UserId() userId: string, @Body() createWalletDto: CreateWalletDto) {
    return this.walletsService.create(userId, createWalletDto);
  }

  @Get()
  @ApiOperation({ summary: 'List active wallets for current user' })
  @ApiOkResponse({
    description: 'Wallets returned successfully.',
    type: Wallet,
    isArray: true,
  })
  @ApiNotFoundResponse({ description: 'User not found.' })
  findAllByUser(@UserId() userId: string) {
    return this.walletsService.findAllByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a wallet by id' })
  @ApiParam({
    name: 'id',
    description: 'Wallet UUID.',
    format: 'uuid',
    example: '2ef8f823-5ac6-40cf-9443-448dce6760f5',
  })
  @ApiOkResponse({
    description: 'Wallet returned successfully.',
    type: Wallet,
  })
  @ApiNotFoundResponse({ description: 'Wallet not found.' })
  findOne(@Param('id', uuidPipe) id: string, @UserId() userId: string) {
    return this.walletsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a wallet by id' })
  @ApiParam({
    name: 'id',
    description: 'Wallet UUID.',
    format: 'uuid',
    example: '2ef8f823-5ac6-40cf-9443-448dce6760f5',
  })
  @ApiOkResponse({
    description: 'Wallet updated successfully.',
    type: Wallet,
  })
  @ApiBadRequestResponse({
    description:
      'No fields provided, invalid wallet payload, or wallet cannot be deactivated while balance is not zero.',
  })
  @ApiNotFoundResponse({ description: 'Wallet not found.' })
  update(
    @Param('id', uuidPipe) id: string,
    @UserId() userId: string,
    @Body() updateWalletDto: UpdateWalletDto,
  ) {
    return this.walletsService.update(id, userId, updateWalletDto);
  }

  @Patch(':id/add-money')
  @ApiOperation({ summary: 'Add money to a wallet by id' })
  @ApiParam({
    name: 'id',
    description: 'Wallet UUID.',
    format: 'uuid',
    example: '2ef8f823-5ac6-40cf-9443-448dce6760f5',
  })
  @ApiOkResponse({
    description: 'Money added successfully.',
    type: Wallet,
  })
  @ApiBadRequestResponse({ description: 'Amount must be a positive integer.' })
  @ApiNotFoundResponse({ description: 'Wallet not found.' })
  addMoney(
    @Param('id', uuidPipe) id: string,
    @UserId() userId: string,
    @Body() addMoneyToWalletDto: AddMoneyToWalletDto,
  ) {
    return this.walletsService.addMoney(id, userId, addMoneyToWalletDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a wallet by id' })
  @ApiParam({
    name: 'id',
    description: 'Wallet UUID.',
    format: 'uuid',
    example: '2ef8f823-5ac6-40cf-9443-448dce6760f5',
  })
  @ApiOkResponse({
    description: 'Wallet deleted successfully.',
    schema: {
      example: {
        message: 'Wallet deleted successfully',
        walletId: '2ef8f823-5ac6-40cf-9443-448dce6760f5',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Wallet cannot be deleted while balance is not zero.',
  })
  @ApiNotFoundResponse({ description: 'Wallet not found.' })
  remove(@Param('id', uuidPipe) id: string, @UserId() userId: string) {
    return this.walletsService.remove(id, userId);
  }
}
