import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { Prisma } from 'src/core/prisma/prisma.client';
import { AddMoneyToWalletDto } from './dto/add-money-to-wallet.dto';

const walletSelect = {
  walletId: true,
  userId: true,
  name: true,
  type: true,
  balance: true,
  isActive: true,
  createdAt: true,
} as const;

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createWalletDto: CreateWalletDto) {
    await this.ensureUserExists(userId);
    const initialBalance = this.resolveNonNegativeIntegerAmount(
      createWalletDto.balance,
      'balance',
    );

    return this.prisma.wallet.create({
      data: {
        userId,
        name: createWalletDto.name,
        type: createWalletDto.type,
        balance: initialBalance,
      },
      select: walletSelect,
    });
  }

  async findAllByUser(userId: string) {
    await this.ensureUserExists(userId);

    return this.prisma.wallet.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: walletSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        walletId: id,
        userId,
        isActive: true,
      },
      select: walletSelect,
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  async update(id: string, userId: string, updateWalletDto: UpdateWalletDto) {
    this.validateUpdatePayloadHasChanges(updateWalletDto);

    if (updateWalletDto.isActive === false) {
      return this.deactivateWalletIfBalanceIsZero(id, userId, {
        name: updateWalletDto.name,
        type: updateWalletDto.type,
      });
    }

    const wallet = await this.prisma.wallet.findFirst({
      where: {
        walletId: id,
        userId,
      },
      select: {
        walletId: true,
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return this.prisma.wallet.update({
      where: {
        walletId: id,
      },
      data: {
        name: updateWalletDto.name,
        type: updateWalletDto.type,
        isActive: updateWalletDto.isActive,
      },
      select: walletSelect,
    });
  }

  async addMoney(
    id: string,
    userId: string,
    addMoneyToWalletDto: AddMoneyToWalletDto,
  ) {
    const amount = this.resolvePositiveIntegerAmount(
      addMoneyToWalletDto.amount,
      'amount',
    );

    const result = await this.prisma.wallet.updateMany({
      where: {
        walletId: id,
        userId,
        isActive: true,
      },
      data: {
        balance: {
          increment: amount,
        },
      },
    });

    if (result.count !== 1) {
      throw new NotFoundException('Wallet not found');
    }

    return this.prisma.wallet.findUnique({
      where: {
        walletId: id,
      },
      select: walletSelect,
    });
  }

  async remove(id: string, userId: string) {
    const result = await this.prisma.wallet.updateMany({
      where: {
        walletId: id,
        userId,
        isActive: true,
        balance: new Prisma.Decimal(0),
      },
      data: {
        isActive: false,
      },
    });

    if (result.count !== 1) {
      await this.ensureWalletCanBeDeleted(id, userId);
    }

    return { message: 'Wallet deleted successfully', walletId: id };
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        userId,
      },
      select: {
        userId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

  private validateUpdatePayloadHasChanges(updateWalletDto: UpdateWalletDto) {
    const hasChanges =
      updateWalletDto.name !== undefined ||
      updateWalletDto.type !== undefined ||
      updateWalletDto.isActive !== undefined;

    if (!hasChanges) {
      throw new BadRequestException('No wallet fields provided to update');
    }
  }

  private resolveNonNegativeIntegerAmount(amount: number, fieldName: string) {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new BadRequestException(
        `${fieldName} must be a non-negative integer`,
      );
    }

    return new Prisma.Decimal(amount);
  }

  private resolvePositiveIntegerAmount(amount: number, fieldName: string) {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    return new Prisma.Decimal(amount);
  }

  private async deactivateWalletIfBalanceIsZero(
    walletId: string,
    userId: string,
    data: Pick<UpdateWalletDto, 'name' | 'type'>,
  ) {
    const result = await this.prisma.wallet.updateMany({
      where: {
        walletId,
        userId,
        balance: new Prisma.Decimal(0),
      },
      data: {
        ...data,
        isActive: false,
      },
    });

    if (result.count !== 1) {
      await this.ensureWalletCanBeDeleted(walletId, userId);
    }

    return this.prisma.wallet.findUnique({
      where: {
        walletId,
      },
      select: walletSelect,
    });
  }

  private async ensureWalletCanBeDeleted(walletId: string, userId: string) {
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        walletId,
        userId,
        isActive: true,
      },
      select: {
        walletId: true,
        balance: true,
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    throw new BadRequestException('Wallet balance must be zero before delete');
  }
}
