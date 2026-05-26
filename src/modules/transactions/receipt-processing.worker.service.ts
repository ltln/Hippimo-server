import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import sharp from 'sharp';
import { ReceiptStatus } from 'src/core/prisma/prisma.client';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { S3Service } from 'src/providers/s3/s3.service';
import { ReceiptProcessingQueueService } from './receipt-processing.queue.service';

const RECEIPT_QUEUE_POLL_INTERVAL_MS = 1000;

@Injectable()
export class ReceiptProcessingWorkerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ReceiptProcessingWorkerService.name);
  private readonly webpQuality = 85;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private isDraining = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly queueService: ReceiptProcessingQueueService,
  ) {}

  onModuleInit() {
    this.pollTimer = setInterval(() => {
      void this.drainQueue();
    }, RECEIPT_QUEUE_POLL_INTERVAL_MS);

    void this.drainQueue();
  }

  onModuleDestroy() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
  }

  private async drainQueue() {
    if (this.isDraining) {
      return;
    }

    this.isDraining = true;

    try {
      while (true) {
        const receiptId = await this.queueService.dequeue();
        if (!receiptId) {
          break;
        }

        await this.processReceipt(receiptId);
      }
    } finally {
      this.isDraining = false;
    }
  }

  private async processReceipt(receiptId: string) {
    const receipt = await this.prisma.receipt.findUnique({
      where: { receiptId },
      select: {
        receiptId: true,
        imageUrl: true,
        status: true,
      },
    });

    if (!receipt || receipt.status === ReceiptStatus.READY) {
      return;
    }

    try {
      await this.prisma.receipt.update({
        where: { receiptId },
        data: { status: ReceiptStatus.PROCESSING },
      });

      const sourceKey = this.s3Service.getObjectKeyFromUrl(receipt.imageUrl);
      if (!sourceKey) {
        throw new Error(
          `Unable to determine object key for receipt ${receiptId}`,
        );
      }

      const sourceObject = await this.s3Service.getObject(sourceKey);
      if (this.isWebp(sourceObject.contentType)) {
        await this.prisma.receipt.update({
          where: { receiptId },
          data: { status: ReceiptStatus.READY },
        });
        return;
      }

      const convertedBody = await sharp(sourceObject.body)
        .webp({ quality: this.webpQuality })
        .toBuffer();

      const uploadedObject = await this.s3Service.uploadObject({
        key: sourceKey,
        body: convertedBody,
        contentType: 'image/webp',
      });

      await this.prisma.receipt.update({
        where: { receiptId },
        data: {
          imageUrl: uploadedObject.url,
          status: ReceiptStatus.READY,
        },
      });
    } catch (error) {
      await this.markReceiptFailed(receiptId);
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to process receipt ${receiptId}: ${message}`);
    }
  }

  private isWebp(contentType?: string) {
    return contentType === 'image/webp';
  }

  private async markReceiptFailed(receiptId: string) {
    try {
      await this.prisma.receipt.update({
        where: { receiptId },
        data: { status: ReceiptStatus.FAILED },
      });
    } catch {
      // Ignore follow-up failures when the receipt row is gone.
    }
  }
}
