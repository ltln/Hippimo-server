import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/core/redis/redis.service';

const RECEIPT_PROCESSING_QUEUE_KEY = 'queue:receipt-processing';

@Injectable()
export class ReceiptProcessingQueueService {
  constructor(private readonly redisService: RedisService) {}

  async enqueue(receiptId: string): Promise<void> {
    await this.redisService.lpush(RECEIPT_PROCESSING_QUEUE_KEY, receiptId);
  }

  async enqueueMany(receiptIds: string[]): Promise<void> {
    await Promise.all(receiptIds.map((receiptId) => this.enqueue(receiptId)));
  }

  async dequeue(): Promise<string | null> {
    return this.redisService.rpop(RECEIPT_PROCESSING_QUEUE_KEY);
  }
}
