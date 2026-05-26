import 'dotenv/config';
import {
  BudgetPeriodType,
  CategoryType,
  InsightType,
  NotificationStatus,
  NotificationsType,
  PrismaClient,
  ReceiptStatus,
  RoleAiChatMess,
  TransactionType,
  UserProvider,
  WalletType,
} from './prisma.client';
import { faker } from '@faker-js/faker';
import { createPrismaClientOptions } from './prisma.options';

const prisma = new PrismaClient(createPrismaClientOptions());
const SEED_COUNT = 10;
const TEST_USER_EMAIL = 'test@gmail.com';
const RANDOM_USER_COUNT = SEED_COUNT - 1;
const USER_FULL_NAME_MAX_LENGTH = 50;
const MAX_WALLET_NAME_LENGTH = 50;

type UserSeedData = {
  email: string;
  fullName: string;
  currency: string;
  provider: UserProvider;
  createdAt: Date;
};

type UserLinkedId = {
  userId: string;
  id: string;
};

function pickRandomId(ids: string[], label: string): string {
  if (ids.length === 0) {
    throw new Error(`Khong co du lieu ${label} de tao ban ghi lien ket.`);
  }

  return faker.helpers.arrayElement(ids);
}

function pickRandomUserLinkedId(
  records: UserLinkedId[],
  userId: string,
  label: string,
): string {
  const ids = records
    .filter((record) => record.userId === userId)
    .map((record) => record.id);

  return pickRandomId(ids, `${label} cua user ${userId}`);
}

function buildUserIdDistribution(
  testUserId: string,
  otherUserIds: string[],
): string[] {
  if (otherUserIds.length === 0) {
    throw new Error('Can it nhat 1 user khac de seed mock data.');
  }

  return [
    testUserId,
    ...Array.from(
      { length: RANDOM_USER_COUNT },
      (_, index) => otherUserIds[index % otherUserIds.length],
    ),
  ];
}

function createRandomUserSeedData(count: number): UserSeedData[] {
  const emails = new Set<string>();
  const users: UserSeedData[] = [];

  while (users.length < count) {
    const email = faker.internet.email().toLowerCase();

    if (email === TEST_USER_EMAIL || emails.has(email)) {
      continue;
    }

    emails.add(email);
    users.push({
      email,
      fullName: normalizeFullName(faker.person.fullName()),
      currency: faker.finance.currencyCode(),
      provider: faker.helpers.arrayElement([
        UserProvider.GOOGLE,
        UserProvider.GMAIL,
        UserProvider.APPLE,
      ]),
      createdAt: faker.date.past(),
    });
  }

  return users;
}

function normalizeFullName(fullName: string): string {
  return fullName.trim().slice(0, USER_FULL_NAME_MAX_LENGTH);
}

function truncateToMaxLength(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

async function main() {
  console.log('Bat dau seed du lieu...');

  const testUser = await prisma.user.upsert({
    where: {
      email: TEST_USER_EMAIL,
    },
    update: {},
    create: {
      email: TEST_USER_EMAIL,
      fullName: 'Test User',
      currency: 'VND',
      provider: UserProvider.GMAIL,
      providerSubject: TEST_USER_EMAIL,
      createdAt: faker.date.past(),
    },
    select: {
      userId: true,
    },
  });
  const testUserId = testUser.userId;
  console.log(`Da tao User test: ${TEST_USER_EMAIL}`);

  const randomUserData = createRandomUserSeedData(RANDOM_USER_COUNT);

  await prisma.user.createMany({
    data: randomUserData,
    skipDuplicates: true,
  });
  console.log(`Da tao ${RANDOM_USER_COUNT} Users random`);

  const seededUsers = await prisma.user.findMany({
    where: {
      email: {
        in: [TEST_USER_EMAIL, ...randomUserData.map((user) => user.email)],
      },
    },
    select: {
      email: true,
      userId: true,
    },
  });
  const otherUserIds = seededUsers
    .filter((user) => user.email !== TEST_USER_EMAIL)
    .map((user) => user.userId);
  const userIdsForMockData = buildUserIdDistribution(testUserId, otherUserIds);
  const distinctUserIdsForMockData = Array.from(new Set(userIdsForMockData));

  await prisma.category.createMany({
    data: userIdsForMockData.map((userId) => ({
      userId,
      name: truncateToMaxLength(faker.commerce.department(), 100),
      type: faker.helpers.arrayElement([
        CategoryType.INCOME,
        CategoryType.EXPENSE,
      ]),
      icon: truncateToMaxLength(faker.image.url(), 255),
      color: truncateToMaxLength(faker.color.human(), 50),
      status: faker.helpers.arrayElement(['ACTIVE', 'INACTIVE']),
    })),
    skipDuplicates: true,
  });
  console.log('Da tao Categories');

  await prisma.wallet.createMany({
    data: userIdsForMockData.map((userId) => {
      const type = faker.helpers.arrayElement([
        WalletType.CASH,
        WalletType.BANK_ACCOUNT,
        WalletType.E_WALLET,
      ]);
      let name = '';

      if (type === WalletType.CASH) {
        name = `Vi tien mat ${faker.string.numeric(4)}`;
      } else if (type === WalletType.BANK_ACCOUNT) {
        name = `Ngan hang ${faker.company.name()}`;
      } else {
        name = `Vi dien tu ${faker.company.name()}`;
      }

      return {
        userId,
        name: name.slice(0, MAX_WALLET_NAME_LENGTH),
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
    data: userIdsForMockData.map((userId) => ({
      userId,
      title: faker.lorem.sentence(),
      createdAt: faker.date.past(),
    })),
    skipDuplicates: true,
  });
  console.log('Da tao Ai Chat Sessions');

  await prisma.financialInsight.createMany({
    data: userIdsForMockData.map((userId) => ({
      userId,
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
    where: {
      userId: {
        in: distinctUserIdsForMockData,
      },
    },
    select: {
      categoryId: true,
      userId: true,
    },
  });
  const categoryRefs = allCategories.map((category) => ({
    userId: category.userId,
    id: category.categoryId,
  }));

  const allWallets = await prisma.wallet.findMany({
    where: {
      userId: {
        in: distinctUserIdsForMockData,
      },
    },
    select: {
      walletId: true,
      userId: true,
    },
  });
  const walletRefs = allWallets.map((wallet) => ({
    userId: wallet.userId,
    id: wallet.walletId,
  }));

  const allAiChatSessions = await prisma.aiChatSession.findMany({
    where: {
      userId: {
        in: distinctUserIdsForMockData,
      },
    },
    select: {
      aiChatSessionId: true,
      userId: true,
    },
  });
  const aiChatSessionRefs = allAiChatSessions.map((session) => ({
    userId: session.userId,
    id: session.aiChatSessionId,
  }));

  await prisma.budget.createMany({
    data: userIdsForMockData.map((userId) => {
      const periodSeed = faker.date.future();
      const periodStart = new Date(
        Date.UTC(
          periodSeed.getUTCFullYear(),
          periodSeed.getUTCMonth(),
          periodSeed.getUTCDate(),
        ),
      );
      const periodEnd = new Date(
        periodStart.getTime() + 30 * 24 * 60 * 60 * 1000 - 1,
      );

      return {
        userId,
        categoryId: pickRandomUserLinkedId(categoryRefs, userId, 'category'),
        amountLimit: faker.finance.amount({
          min: 100000,
          max: 20000000,
          dec: 2,
        }),
        periodType: BudgetPeriodType.MONTH,
        periodStart,
        periodEnd,
        alertThresholdPercent: faker.number.int({ min: 50, max: 100 }),
      };
    }),
    skipDuplicates: true,
  });
  console.log('Da tao Budgets');

  await prisma.aiChatMessage.createMany({
    data: userIdsForMockData.map((userId) => ({
      sessionId: pickRandomUserLinkedId(
        aiChatSessionRefs,
        userId,
        'ai chat session',
      ),
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
    data: userIdsForMockData.map((userId) => ({
      userId,
      walletId: pickRandomUserLinkedId(walletRefs, userId, 'wallet'),
      categoryId: pickRandomUserLinkedId(categoryRefs, userId, 'category'),
      amount: faker.finance.amount({ min: 10000, max: 5000000, dec: 2 }),
      type: faker.helpers.arrayElement([
        TransactionType.INCOME,
        TransactionType.EXPENSE,
        TransactionType.TRANSFER,
      ]),
      transactionDate: faker.date.recent(),
      notes: faker.lorem.sentence(),
    })),
    skipDuplicates: true,
  });
  console.log('Da tao Transactions');

  const allTransactions = await prisma.transaction.findMany({
    where: {
      userId: {
        in: distinctUserIdsForMockData,
      },
    },
    select: {
      transactionId: true,
      userId: true,
    },
  });
  const transactionRefs = allTransactions.map((transaction) => ({
    userId: transaction.userId,
    id: transaction.transactionId,
  }));

  await prisma.notification.createMany({
    data: userIdsForMockData.map((userId) => ({
      userId,
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
      relatedTransactionId: pickRandomUserLinkedId(
        transactionRefs,
        userId,
        'transaction',
      ),
      createdAt: faker.date.past(),
    })),
    skipDuplicates: true,
  });
  console.log('Da tao Notifications');

  await prisma.receipt.createMany({
    data: userIdsForMockData.map((userId) => ({
      transactionId: pickRandomUserLinkedId(
        transactionRefs,
        userId,
        'transaction',
      ),
      userId,
      imageUrl: faker.image.url(),
      status: faker.helpers.arrayElement([
        ReceiptStatus.UPLOADED,
        ReceiptStatus.PROCESSING,
        ReceiptStatus.READY,
        ReceiptStatus.FAILED,
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
