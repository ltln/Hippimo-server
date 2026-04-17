import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from './prisma.client';
import { createPrismaClientOptions } from './prisma.options';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super(createPrismaClientOptions());
  }

  async onModuleInit() {
    await this.$connect();
  }
}
