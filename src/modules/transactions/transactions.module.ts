import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { PrismaModule } from 'src/core/prisma/prisma.module';
import { S3Module } from 'src/providers/s3/s3.module';
import { RedisModule } from 'src/core/redis/redis.module';
import { ReceiptProcessingQueueService } from './receipt-processing.queue.service';
import { ReceiptProcessingWorkerService } from './receipt-processing.worker.service';

@Module({
  imports: [PrismaModule, S3Module, RedisModule],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    ReceiptProcessingQueueService,
    ReceiptProcessingWorkerService,
  ],
})
export class TransactionsModule {}
