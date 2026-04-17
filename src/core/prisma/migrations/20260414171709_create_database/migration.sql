-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationsType" AS ENUM ('BUDGET_WARNING', 'ABNORMAL_SPENDING', 'SYSTEM');

-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('HABIT_ANALYSIS', 'PREDICTION', 'HEALTH_SCORE');

-- CreateEnum
CREATE TYPE "RoleAiChatMess" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "CategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED');

-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "full_name" VARCHAR(50),
    "pin_code" VARCHAR(255),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'VND',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "wallet_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name_wallet" VARCHAR(50) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "balance" DECIMAL(15,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("wallet_id")
);

-- CreateTable
CREATE TABLE "categories" (
    "category_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "icon" VARCHAR(255),
    "color" VARCHAR(20),
    "status" "CategoryStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "transaction_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "wallet_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "linked_transaction_id" INTEGER,
    "is_excluded_from_report" BOOLEAN NOT NULL DEFAULT false,
    "ai_suggested_category_id" INTEGER,
    "is_essential" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "receipt_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "transaction_id" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "extracted_text" TEXT,
    "extracted_amount" DECIMAL(15,2),
    "extracted_merchant" VARCHAR(100),
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("receipt_id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "budget_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "amount_limit" DECIMAL(15,2) NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "alert_threshold_percent" INTEGER NOT NULL DEFAULT 80,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("budget_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "type" "NotificationsType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "related_transaction_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "financial_insights" (
    "financial_insights_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "insight_type" "InsightType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "score" INTEGER,
    "predicted_amount" DECIMAL(15,2),
    "target_period" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_insights_pkey" PRIMARY KEY ("financial_insights_id")
);

-- CreateTable
CREATE TABLE "ai_chat_sessions" (
    "ai_chat_session_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_chat_sessions_pkey" PRIMARY KEY ("ai_chat_session_id")
);

-- CreateTable
CREATE TABLE "ai_chat_messages" (
    "ai_chat_mess_id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "role" "RoleAiChatMess" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_chat_messages_pkey" PRIMARY KEY ("ai_chat_mess_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("wallet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_ai_suggested_category_id_fkey" FOREIGN KEY ("ai_suggested_category_id") REFERENCES "categories"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_linked_transaction_id_fkey" FOREIGN KEY ("linked_transaction_id") REFERENCES "transactions"("transaction_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("transaction_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_transaction_id_fkey" FOREIGN KEY ("related_transaction_id") REFERENCES "transactions"("transaction_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_insights" ADD CONSTRAINT "financial_insights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "ai_chat_sessions"("ai_chat_session_id") ON DELETE RESTRICT ON UPDATE CASCADE;
