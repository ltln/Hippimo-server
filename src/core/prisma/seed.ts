import 'dotenv/config';
import {
  BudgetPeriodType,
  CategoryStatus,
  CategoryType,
  InsightType,
  NotificationStatus,
  NotificationsType,
  PrismaClient,
  RoleAiChatMess,
  TransactionType,
  UserProvider,
  WalletType,
} from './prisma.client';
import { faker } from '@faker-js/faker';
import { createPrismaClientOptions } from './prisma.options';

const prisma = new PrismaClient(createPrismaClientOptions());
const USER_COUNT = intEnv('USER_COUNT', 10);
const TRANSACTION_COUNT = intEnv('TRANSACTION_COUNT', 12);
const TEST_USER_EMAIL = 'test@gmail.com';
const DOMAIN = 'seed.hippimo.local';
const VND_STEP = 1000;
const RECENT_TRANSACTION_DAY_WINDOWS = [1, 3, 7] as const;
const VIETNAMESE_TRANSACTION_NOTES = {
  [TransactionType.INCOME]: [
    'Nhận lương tháng này',
    'Thanh toán tiền làm thêm',
    'Khách chuyển khoản dự án',
    'Thu nhập phụ trong tuần',
  ],
  [TransactionType.EXPENSE]: [
    'Ăn trưa với đồng nghiệp',
    'Mua đồ dùng cá nhân',
    'Thanh toán hóa đơn sinh hoạt',
    'Đặt xe đi làm',
    'Mua cà phê buổi sáng',
  ],
  [TransactionType.TRANSFER]: [
    'Chuyển tiền giữa các ví',
    'Nạp tiền vào ví điện tử',
    'Chuyển tiền sang tài khoản chính',
    'Điều chỉnh số dư ví',
  ],
} as const;
const DEFAULT_CATEGORIES = [
  ['Salary', CategoryType.INCOME, 'briefcase', '#2E8B57'],
  ['Freelance', CategoryType.INCOME, 'laptop', '#1F6FEB'],
  ['Food', CategoryType.EXPENSE, 'utensils', '#E67E22'],
  ['Transport', CategoryType.EXPENSE, 'car', '#8E44AD'],
  ['Bills', CategoryType.EXPENSE, 'receipt', '#C0392B'],
] as const;

function intEnv(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(name + ' must be a positive integer.');
  }
  return parsed;
}

function cut(value: string, max: number) {
  return value.length > max ? value.slice(0, max) : value;
}

function money(min: number, max: number) {
  const minUnits = Math.ceil(min / VND_STEP);
  const maxUnits = Math.floor(max / VND_STEP);

  if (minUnits > maxUnits) {
    throw new Error('Invalid VND range.');
  }

  const amount = faker.number.int({ min: minUnits, max: maxUnits }) * VND_STEP;
  return amount.toFixed(2);
}

function recentTransactionDate() {
  const days = faker.helpers.arrayElement(RECENT_TRANSACTION_DAY_WINDOWS);
  return faker.date.recent({ days });
}

function transactionNote(type: TransactionType) {
  return faker.helpers.arrayElement(VIETNAMESE_TRANSACTION_NOTES[type]);
}

function providerSubject(provider: UserProvider, email: string) {
  if (provider === UserProvider.GMAIL) {
    return email;
  }

  return provider.toLowerCase() + ':' + email;
}

function monthRange(anchor: Date) {
  const start = new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1),
  );
  return {
    periodStart: start,
    periodEnd: new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000 - 1),
  };
}

function buildUsers() {
  const testCreatedAt = faker.date.past({ years: 2 });
  const users: Array<{
    userId: string;
    email: string;
    fullName: string;
    currency: string;
    provider: UserProvider;
    providerSubject: string;
    createdAt: Date;
  }> = [
    {
      userId: faker.string.uuid(),
      email: TEST_USER_EMAIL,
      fullName: 'Test User',
      currency: 'VND',
      provider: UserProvider.GMAIL,
      providerSubject: providerSubject(UserProvider.GMAIL, TEST_USER_EMAIL),
      createdAt: testCreatedAt,
    },
  ];
  for (let i = 1; i < USER_COUNT; i += 1) {
    const provider = faker.helpers.arrayElement([
      UserProvider.GOOGLE,
      UserProvider.GMAIL,
    ]);
    const email = 'seed.user.' + String(i).padStart(3, '0') + '@' + DOMAIN;
    users.push({
      userId: faker.string.uuid(),
      email,
      fullName: cut(faker.person.fullName().trim(), 50),
      currency: 'VND',
      provider,
      providerSubject: providerSubject(provider, email),
      createdAt: faker.date.between({ from: testCreatedAt, to: new Date() }),
    });
  }
  return users;
}

function buildUserData(user: ReturnType<typeof buildUsers>[number]) {
  const categories = DEFAULT_CATEGORIES.map(([name, type, icon, color]) => ({
    categoryId: faker.string.uuid(),
    userId: user.userId,
    name: cut(name, 50),
    type,
    icon,
    color: cut(color, 20),
    status: CategoryStatus.ACTIVE,
  }));
  const income = categories.filter((x) => x.type === CategoryType.INCOME);
  const expense = categories.filter((x) => x.type === CategoryType.EXPENSE);
  const wallets = (
    [
      ['Cash Wallet', WalletType.CASH],
      ['Main Bank', WalletType.BANK_ACCOUNT],
      ['E-Wallet', WalletType.E_WALLET],
    ] as const
  ).map(([name, type]) => ({
    walletId: faker.string.uuid(),
    userId: user.userId,
    name: cut(name, 50),
    type,
    balance: 0,
    isActive: true,
    createdAt: user.createdAt,
  }));
  const balances = new Map(
    wallets.map((wallet) => [wallet.walletId, Number(money(500000, 5000000))]),
  );
  const walletIds = wallets.map((wallet) => wallet.walletId);

  const transactions = Array.from({ length: TRANSACTION_COUNT }, () => {
    const walletId = faker.helpers.arrayElement(walletIds);
    const type = faker.helpers.arrayElement([
      TransactionType.INCOME,
      TransactionType.EXPENSE,
      TransactionType.TRANSFER,
    ]);
    const amount = Number(money(50000, 2500000));
    const transactionDate = recentTransactionDate();
    let categoryId: string | null = null;
    let toWalletId: string | null = null;

    if (type === TransactionType.INCOME) {
      categoryId = faker.helpers.arrayElement(income).categoryId;
      balances.set(walletId, (balances.get(walletId) ?? 0) + amount);
    } else if (type === TransactionType.EXPENSE) {
      categoryId = faker.helpers.arrayElement(expense).categoryId;
      balances.set(walletId, (balances.get(walletId) ?? 0) - amount);
    } else {
      const targetIds = walletIds.filter((id) => id !== walletId);
      toWalletId = faker.helpers.arrayElement(targetIds);
      balances.set(walletId, (balances.get(walletId) ?? 0) - amount);
      balances.set(toWalletId, (balances.get(toWalletId) ?? 0) + amount);
    }

    return {
      transactionId: faker.string.uuid(),
      userId: user.userId,
      walletId,
      toWalletId,
      categoryId,
      amount: amount.toFixed(2),
      type,
      transactionDate,
      notes: transactionNote(type),
      isExcludedFromReport: false,
      isEssential:
        type === TransactionType.EXPENSE ? faker.datatype.boolean() : false,
      createdAt: transactionDate,
    };
  });

  const walletRows = wallets.map((wallet) => ({
    ...wallet,
    balance: (balances.get(wallet.walletId) ?? 0).toFixed(2),
  }));
  const session = {
    aiChatSessionId: faker.string.uuid(),
    userId: user.userId,
    title: 'Money assistant session',
    createdAt: faker.date.between({ from: user.createdAt, to: new Date() }),
  };
  const messages = Array.from({ length: 4 }, (_, i) => ({
    aiChatMessId: faker.string.uuid(),
    sessionId: session.aiChatSessionId,
    role: i % 2 === 0 ? RoleAiChatMess.USER : RoleAiChatMess.ASSISTANT,
    content: faker.lorem.sentences(2),
    createdAt: new Date(session.createdAt.getTime() + i * 60000),
  }));
  const insights = Array.from({ length: 2 }, () => ({
    financialInsightsId: faker.string.uuid(),
    userId: user.userId,
    insightType: faker.helpers.arrayElement([
      InsightType.HEALTH_SCORE,
      InsightType.PREDICTION,
      InsightType.HABIT_ANALYSIS,
    ]),
    title: cut(faker.lorem.sentence(), 255),
    content: faker.lorem.paragraph(),
    score: faker.number.int({ min: 60, max: 100 }),
    predictedAmount: money(100000, 10000000),
    targetPeriod: faker.date.soon({ days: 120 }).toISOString().slice(0, 10),
    createdAt: faker.date.between({ from: user.createdAt, to: new Date() }),
  }));
  const { periodStart, periodEnd } = monthRange(new Date());
  const budgets = expense.map((category) => ({
    budgetId: faker.string.uuid(),
    userId: user.userId,
    categoryId: category.categoryId,
    amountLimit: money(1000000, 10000000),
    periodType: BudgetPeriodType.MONTH,
    periodStart,
    periodEnd,
    alertThresholdPercent: faker.number.int({ min: 70, max: 90 }),
  }));
  const notifications = transactions.slice(0, 3).map((transaction, i) => ({
    notificationId: faker.string.uuid(),
    userId: user.userId,
    title: 'Notification ' + (i + 1),
    content: faker.lorem.sentence(),
    type: faker.helpers.arrayElement([
      NotificationsType.BUDGET_WARNING,
      NotificationsType.ABNORMAL_SPENDING,
      NotificationsType.SYSTEM,
    ]),
    status: faker.helpers.arrayElement([
      NotificationStatus.UNREAD,
      NotificationStatus.READ,
      NotificationStatus.ARCHIVED,
    ]),
    relatedTransactionId: transaction.transactionId,
    createdAt: new Date(transaction.createdAt.getTime() + (i + 1) * 1000),
  }));
  return {
    categories,
    wallets: walletRows,
    sessions: [session],
    messages,
    insights,
    budgets,
    transactions,
    notifications,
  };
}

async function main() {
  console.log(
    'Seeding ' +
      USER_COUNT +
      ' users with ' +
      TRANSACTION_COUNT +
      ' transactions each...',
  );
  const users = buildUsers();
  const seedEmails = users.map((user) => user.email);
  const categories = [] as ReturnType<typeof buildUserData>['categories'];
  const wallets = [] as ReturnType<typeof buildUserData>['wallets'];
  const sessions = [] as ReturnType<typeof buildUserData>['sessions'];
  const messages = [] as ReturnType<typeof buildUserData>['messages'];
  const insights = [] as ReturnType<typeof buildUserData>['insights'];
  const budgets = [] as ReturnType<typeof buildUserData>['budgets'];
  const transactions = [] as ReturnType<typeof buildUserData>['transactions'];
  const notifications = [] as ReturnType<typeof buildUserData>['notifications'];

  for (const user of users) {
    const data = buildUserData(user);
    categories.push(...data.categories);
    wallets.push(...data.wallets);
    sessions.push(...data.sessions);
    messages.push(...data.messages);
    insights.push(...data.insights);
    budgets.push(...data.budgets);
    transactions.push(...data.transactions);
    notifications.push(...data.notifications);
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findMany({
      where: { email: { in: seedEmails } },
      select: { userId: true },
    });
    const ids = existing.map((user) => user.userId);

    if (ids.length > 0) {
      await tx.receipt.deleteMany({ where: { userId: { in: ids } } });
      await tx.notification.deleteMany({ where: { userId: { in: ids } } });
      await tx.aiChatMessage.deleteMany({
        where: { session: { userId: { in: ids } } },
      });
      await tx.transaction.deleteMany({ where: { userId: { in: ids } } });
      await tx.budget.deleteMany({ where: { userId: { in: ids } } });
      await tx.financialInsight.deleteMany({ where: { userId: { in: ids } } });
      await tx.aiChatSession.deleteMany({ where: { userId: { in: ids } } });
      await tx.wallet.deleteMany({ where: { userId: { in: ids } } });
      await tx.category.deleteMany({ where: { userId: { in: ids } } });
      await tx.user.deleteMany({ where: { userId: { in: ids } } });
    }

    await tx.user.createMany({ data: users });
    await tx.category.createMany({ data: categories });
    await tx.wallet.createMany({ data: wallets });
    await tx.aiChatSession.createMany({ data: sessions });
    await tx.aiChatMessage.createMany({ data: messages });
    await tx.financialInsight.createMany({ data: insights });
    await tx.budget.createMany({ data: budgets });
    await tx.transaction.createMany({ data: transactions });
    await tx.notification.createMany({ data: notifications });
  });

  console.log(
    'Seeded ' +
      users.length +
      ' users, ' +
      categories.length +
      ' categories, ' +
      transactions.length +
      ' transactions.',
  );
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
