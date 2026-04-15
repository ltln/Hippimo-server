import 'dotenv/config';
import {
  InsightType,
  NotificationStatus,
  NotificationsType,
  PrismaClient,
  RoleAiChatMess,
  TransactionStatus,
} from './prisma.client';
import { faker } from '@faker-js/faker';
import { createPrismaClientOptions } from './prisma.options';

const prisma = new PrismaClient(createPrismaClientOptions());
const SEED_COUNT = 5;

function pickRandomId(ids: number[], label: string): number {
  if (ids.length === 0) {
    throw new Error(`Khong co du lieu ${label} de tao ban ghi lien ket.`);
  }

  return faker.helpers.arrayElement(ids);
}

async function main() {
  console.log('Bat dau seed du lieu...');

  await prisma.user.createMany({
    data: Array.from({ length: SEED_COUNT }).map(() => ({
      email: faker.internet.email(),
      fullName: faker.person.fullName(),
      pinCode: faker.string.numeric(6),
      currency: faker.finance.currencyCode(),
      createdAt: faker.date.past(),
    })),
    skipDuplicates: true,
  });
  console.log('Da tao Users');

  const allUsers = await prisma.user.findMany({
    select: {
      userId: true,
    },
  });
  const userIds = allUsers.map((user) => user.userId);

  await prisma.category.createMany({
    data: Array.from({ length: SEED_COUNT }).map(() => ({
      userId: pickRandomId(userIds, 'user'),
      name: faker.commerce.department(),
      type: faker.helpers.arrayElement(['INCOME', 'EXPENSE']),
      icon: faker.image.url(),
      color: faker.color.human(),
      status: faker.helpers.arrayElement(['ACTIVE', 'INACTIVE']),
    })),
    skipDuplicates: true,
  });
  console.log('Da tao Categories');

  await prisma.wallet.createMany({
    data: Array.from({ length: SEED_COUNT }).map(() => {
      const type = faker.helpers.arrayElement([
        'Tien mat',
        'Ngan hang',
        'Vi dien tu',
      ]);
      let name = '';

      if (type === 'Tien mat') {
        name = `Vi tien mat ${faker.string.numeric(4)}`;
      } else if (type === 'Ngan hang') {
        name = `Ngan hang ${faker.company.name()}`;
      } else {
        name = `Vi dien tu ${faker.company.name()}`;
      }

      return {
        userId: pickRandomId(userIds, 'user'),
        name,
        type,
        balance: faker.finance.amount({ min: 1000, max: 1000000, dec: 2 }),
        isActive: faker.datatype.boolean(),
        createdAt: faker.date.past(),
      };
    }),
    skipDuplicates: true,
  });
  console.log('Da tao Wallets');

  await prisma.aiChatSession.createMany({
    data: Array.from({ length: SEED_COUNT }).map(() => ({
      userId: pickRandomId(userIds, 'user'),
      title: faker.lorem.sentence(),
      createdAt: faker.date.past(),
    })),
    skipDuplicates: true,
  });
  console.log('Da tao Ai Chat Sessions');

  await prisma.financialInsight.createMany({
    data: Array.from({ length: SEED_COUNT }).map(() => ({
      userId: pickRandomId(userIds, 'user'),
      insightType: faker.helpers.arrayElement([
        InsightType.HEALTH_SCORE,
        InsightType.PREDICTION,
        InsightType.HABIT_ANALYSIS,
      ]),
      title: faker.lorem.sentence(),
      content: faker.lorem.paragraph(),
      score: faker.number.int({ min: 1, max: 100 }),
      predictedAmount: faker.finance.amount({
        min: 50000,
        max: 5000000,
        dec: 2,
      }),
      targetPeriod: faker.date.future().toISOString(),
      createdAt: faker.date.past(),
    })),
    skipDuplicates: true,
  });
  console.log('Da tao Financial Insights');

  const allCategories = await prisma.category.findMany({
    select: {
      categoryId: true,
    },
  });
  const categoryIds = allCategories.map((category) => category.categoryId);

  const allWallets = await prisma.wallet.findMany({
    select: {
      walletId: true,
    },
  });
  const walletIds = allWallets.map((wallet) => wallet.walletId);

  const allAiChatSessions = await prisma.aiChatSession.findMany({
    select: {
      aiChatSessionId: true,
    },
  });
  const aiChatSessionIds = allAiChatSessions.map(
    (session) => session.aiChatSessionId,
  );

  await prisma.budget.createMany({
    data: Array.from({ length: SEED_COUNT }).map(() => {
      const monthSeed = faker.date.future();

      return {
        userId: pickRandomId(userIds, 'user'),
        categoryId: pickRandomId(categoryIds, 'category'),
        amountLimit: faker.finance.amount({
          min: 100000,
          max: 20000000,
          dec: 2,
        }),
        month: monthSeed.getMonth() + 1,
        year: monthSeed.getFullYear(),
        alertThresholdPercent: faker.number.int({ min: 50, max: 100 }),
      };
    }),
    skipDuplicates: true,
  });
  console.log('Da tao Budgets');

  await prisma.aiChatMessage.createMany({
    data: Array.from({ length: SEED_COUNT }).map(() => ({
      sessionId: pickRandomId(aiChatSessionIds, 'ai chat session'),
      role: faker.helpers.arrayElement([
        RoleAiChatMess.USER,
        RoleAiChatMess.ASSISTANT,
      ]),
      content: faker.lorem.paragraph(),
      createdAt: faker.date.past(),
    })),
    skipDuplicates: true,
  });
  console.log('Da tao Ai Chat Messages');

  await prisma.transaction.createMany({
    data: Array.from({ length: SEED_COUNT }).map(() => ({
      userId: pickRandomId(userIds, 'user'),
      walletId: pickRandomId(walletIds, 'wallet'),
      categoryId: pickRandomId(categoryIds, 'category'),
      amount: faker.finance.amount({ min: 10000, max: 5000000, dec: 2 }),
      type: faker.helpers.arrayElement(['INCOME', 'EXPENSE', 'TRANSFER']),
      transactionDate: faker.date.recent(),
      notes: faker.lorem.sentence(),
    })),
    skipDuplicates: true,
  });
  console.log('Da tao Transactions');

  const allTransactions = await prisma.transaction.findMany({
    select: {
      transactionId: true,
    },
  });
  const transactionIds = allTransactions.map(
    (transaction) => transaction.transactionId,
  );

  await prisma.notification.createMany({
    data: Array.from({ length: SEED_COUNT }).map(() => ({
      userId: pickRandomId(userIds, 'user'),
      title: faker.lorem.sentence(),
      content: faker.lorem.paragraph(),
      type: faker.helpers.arrayElement([
        NotificationsType.ABNORMAL_SPENDING,
        NotificationsType.SYSTEM,
        NotificationsType.BUDGET_WARNING,
      ]),
      status: faker.helpers.arrayElement([
        NotificationStatus.ARCHIVED,
        NotificationStatus.READ,
        NotificationStatus.UNREAD,
      ]),
      relatedTransactionId: pickRandomId(transactionIds, 'transaction'),
      createdAt: faker.date.past(),
    })),
    skipDuplicates: true,
  });
  console.log('Da tao Notifications');

  await prisma.receipt.createMany({
    data: Array.from({ length: SEED_COUNT }).map(() => ({
      transactionId: pickRandomId(transactionIds, 'transaction'),
      userId: pickRandomId(userIds, 'user'),
      imageUrl: faker.image.url(),
      status: faker.helpers.arrayElement([
        TransactionStatus.PENDING,
        TransactionStatus.CONFIRMED,
        TransactionStatus.REJECTED,
      ]),
      createdAt: faker.date.past(),
    })),
  });
  console.log('Seed thanh cong');
}

main()
  .catch((e) => {
    console.error('Loi trong qua trinh seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
