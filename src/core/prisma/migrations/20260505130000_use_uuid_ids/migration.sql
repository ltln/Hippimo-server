CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop foreign keys before rewriting primary and foreign key column types.
ALTER TABLE "wallets" DROP CONSTRAINT IF EXISTS "wallets_user_id_fkey";
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_user_id_fkey";
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_user_id_fkey";
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_wallet_id_fkey";
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_to_wallet_id_fkey";
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_category_id_fkey";
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_ai_suggested_category_id_fkey";
ALTER TABLE "receipts" DROP CONSTRAINT IF EXISTS "receipts_user_id_fkey";
ALTER TABLE "receipts" DROP CONSTRAINT IF EXISTS "receipts_transaction_id_fkey";
ALTER TABLE "budgets" DROP CONSTRAINT IF EXISTS "budgets_user_id_fkey";
ALTER TABLE "budgets" DROP CONSTRAINT IF EXISTS "budgets_category_id_fkey";
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_user_id_fkey";
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_related_transaction_id_fkey";
ALTER TABLE "financial_insights" DROP CONSTRAINT IF EXISTS "financial_insights_user_id_fkey";
ALTER TABLE "ai_chat_sessions" DROP CONSTRAINT IF EXISTS "ai_chat_sessions_user_id_fkey";
ALTER TABLE "ai_chat_messages" DROP CONSTRAINT IF EXISTS "ai_chat_messages_session_id_fkey";

-- Map existing integer identifiers to UUIDs so current relations stay intact.
CREATE TEMP TABLE "_uuid_users" AS
SELECT "user_id" AS "old_id", gen_random_uuid() AS "new_id"
FROM "users";

CREATE TEMP TABLE "_uuid_wallets" AS
SELECT "wallet_id" AS "old_id", gen_random_uuid() AS "new_id"
FROM "wallets";

CREATE TEMP TABLE "_uuid_categories" AS
SELECT "category_id" AS "old_id", gen_random_uuid() AS "new_id"
FROM "categories";

CREATE TEMP TABLE "_uuid_transactions" AS
SELECT "transaction_id" AS "old_id", gen_random_uuid() AS "new_id"
FROM "transactions";

CREATE TEMP TABLE "_uuid_receipts" AS
SELECT "receipt_id" AS "old_id", gen_random_uuid() AS "new_id"
FROM "receipts";

CREATE TEMP TABLE "_uuid_budgets" AS
SELECT "budget_id" AS "old_id", gen_random_uuid() AS "new_id"
FROM "budgets";

CREATE TEMP TABLE "_uuid_notifications" AS
SELECT "notification_id" AS "old_id", gen_random_uuid() AS "new_id"
FROM "notifications";

CREATE TEMP TABLE "_uuid_financial_insights" AS
SELECT "financial_insights_id" AS "old_id", gen_random_uuid() AS "new_id"
FROM "financial_insights";

CREATE TEMP TABLE "_uuid_ai_chat_sessions" AS
SELECT "ai_chat_session_id" AS "old_id", gen_random_uuid() AS "new_id"
FROM "ai_chat_sessions";

CREATE TEMP TABLE "_uuid_ai_chat_messages" AS
SELECT "ai_chat_mess_id" AS "old_id", gen_random_uuid() AS "new_id"
FROM "ai_chat_messages";

ALTER TABLE "users" ADD COLUMN "user_id_uuid" UUID;

ALTER TABLE "wallets"
ADD COLUMN "wallet_id_uuid" UUID,
ADD COLUMN "user_id_uuid" UUID;

ALTER TABLE "categories"
ADD COLUMN "category_id_uuid" UUID,
ADD COLUMN "user_id_uuid" UUID;

ALTER TABLE "transactions"
ADD COLUMN "transaction_id_uuid" UUID,
ADD COLUMN "user_id_uuid" UUID,
ADD COLUMN "wallet_id_uuid" UUID,
ADD COLUMN "to_wallet_id_uuid" UUID,
ADD COLUMN "category_id_uuid" UUID,
ADD COLUMN "ai_suggested_category_id_uuid" UUID;

ALTER TABLE "receipts"
ADD COLUMN "receipt_id_uuid" UUID,
ADD COLUMN "user_id_uuid" UUID,
ADD COLUMN "transaction_id_uuid" UUID;

ALTER TABLE "budgets"
ADD COLUMN "budget_id_uuid" UUID,
ADD COLUMN "user_id_uuid" UUID,
ADD COLUMN "category_id_uuid" UUID;

ALTER TABLE "notifications"
ADD COLUMN "notification_id_uuid" UUID,
ADD COLUMN "user_id_uuid" UUID,
ADD COLUMN "related_transaction_id_uuid" UUID;

ALTER TABLE "financial_insights"
ADD COLUMN "financial_insights_id_uuid" UUID,
ADD COLUMN "user_id_uuid" UUID;

ALTER TABLE "ai_chat_sessions"
ADD COLUMN "ai_chat_session_id_uuid" UUID,
ADD COLUMN "user_id_uuid" UUID;

ALTER TABLE "ai_chat_messages"
ADD COLUMN "ai_chat_mess_id_uuid" UUID,
ADD COLUMN "session_id_uuid" UUID;

UPDATE "users" AS "u"
SET "user_id_uuid" = "m"."new_id"
FROM "_uuid_users" AS "m"
WHERE "u"."user_id" = "m"."old_id";

UPDATE "wallets" AS "w"
SET
  "wallet_id_uuid" = "wm"."new_id",
  "user_id_uuid" = "um"."new_id"
FROM "_uuid_wallets" AS "wm", "_uuid_users" AS "um"
WHERE "w"."wallet_id" = "wm"."old_id"
  AND "w"."user_id" = "um"."old_id";

UPDATE "categories" AS "c"
SET
  "category_id_uuid" = "cm"."new_id",
  "user_id_uuid" = "um"."new_id"
FROM "_uuid_categories" AS "cm", "_uuid_users" AS "um"
WHERE "c"."category_id" = "cm"."old_id"
  AND "c"."user_id" = "um"."old_id";

UPDATE "transactions" AS "t"
SET
  "transaction_id_uuid" = (SELECT "new_id" FROM "_uuid_transactions" WHERE "old_id" = "t"."transaction_id"),
  "user_id_uuid" = (SELECT "new_id" FROM "_uuid_users" WHERE "old_id" = "t"."user_id"),
  "wallet_id_uuid" = (SELECT "new_id" FROM "_uuid_wallets" WHERE "old_id" = "t"."wallet_id"),
  "to_wallet_id_uuid" = (SELECT "new_id" FROM "_uuid_wallets" WHERE "old_id" = "t"."to_wallet_id"),
  "category_id_uuid" = (SELECT "new_id" FROM "_uuid_categories" WHERE "old_id" = "t"."category_id"),
  "ai_suggested_category_id_uuid" = (SELECT "new_id" FROM "_uuid_categories" WHERE "old_id" = "t"."ai_suggested_category_id");

UPDATE "receipts" AS "r"
SET
  "receipt_id_uuid" = "rm"."new_id",
  "user_id_uuid" = "um"."new_id",
  "transaction_id_uuid" = "tm"."new_id"
FROM "_uuid_receipts" AS "rm", "_uuid_users" AS "um", "_uuid_transactions" AS "tm"
WHERE "r"."receipt_id" = "rm"."old_id"
  AND "r"."user_id" = "um"."old_id"
  AND "r"."transaction_id" = "tm"."old_id";

UPDATE "budgets" AS "b"
SET
  "budget_id_uuid" = "bm"."new_id",
  "user_id_uuid" = "um"."new_id",
  "category_id_uuid" = "cm"."new_id"
FROM "_uuid_budgets" AS "bm", "_uuid_users" AS "um", "_uuid_categories" AS "cm"
WHERE "b"."budget_id" = "bm"."old_id"
  AND "b"."user_id" = "um"."old_id"
  AND "b"."category_id" = "cm"."old_id";

UPDATE "notifications" AS "n"
SET
  "notification_id_uuid" = (SELECT "new_id" FROM "_uuid_notifications" WHERE "old_id" = "n"."notification_id"),
  "user_id_uuid" = (SELECT "new_id" FROM "_uuid_users" WHERE "old_id" = "n"."user_id"),
  "related_transaction_id_uuid" = (SELECT "new_id" FROM "_uuid_transactions" WHERE "old_id" = "n"."related_transaction_id");

UPDATE "financial_insights" AS "f"
SET
  "financial_insights_id_uuid" = "fm"."new_id",
  "user_id_uuid" = "um"."new_id"
FROM "_uuid_financial_insights" AS "fm", "_uuid_users" AS "um"
WHERE "f"."financial_insights_id" = "fm"."old_id"
  AND "f"."user_id" = "um"."old_id";

UPDATE "ai_chat_sessions" AS "s"
SET
  "ai_chat_session_id_uuid" = "sm"."new_id",
  "user_id_uuid" = "um"."new_id"
FROM "_uuid_ai_chat_sessions" AS "sm", "_uuid_users" AS "um"
WHERE "s"."ai_chat_session_id" = "sm"."old_id"
  AND "s"."user_id" = "um"."old_id";

UPDATE "ai_chat_messages" AS "m"
SET
  "ai_chat_mess_id_uuid" = "mm"."new_id",
  "session_id_uuid" = "sm"."new_id"
FROM "_uuid_ai_chat_messages" AS "mm", "_uuid_ai_chat_sessions" AS "sm"
WHERE "m"."ai_chat_mess_id" = "mm"."old_id"
  AND "m"."session_id" = "sm"."old_id";

ALTER TABLE "users" DROP CONSTRAINT "users_pkey";
ALTER TABLE "wallets" DROP CONSTRAINT "wallets_pkey";
ALTER TABLE "categories" DROP CONSTRAINT "categories_pkey";
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_pkey";
ALTER TABLE "receipts" DROP CONSTRAINT "receipts_pkey";
ALTER TABLE "budgets" DROP CONSTRAINT "budgets_pkey";
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_pkey";
ALTER TABLE "financial_insights" DROP CONSTRAINT "financial_insights_pkey";
ALTER TABLE "ai_chat_sessions" DROP CONSTRAINT "ai_chat_sessions_pkey";
ALTER TABLE "ai_chat_messages" DROP CONSTRAINT "ai_chat_messages_pkey";

ALTER TABLE "users" DROP COLUMN "user_id";
ALTER TABLE "users" RENAME COLUMN "user_id_uuid" TO "user_id";

ALTER TABLE "wallets" DROP COLUMN "wallet_id";
ALTER TABLE "wallets" DROP COLUMN "user_id";
ALTER TABLE "wallets" RENAME COLUMN "wallet_id_uuid" TO "wallet_id";
ALTER TABLE "wallets" RENAME COLUMN "user_id_uuid" TO "user_id";

ALTER TABLE "categories" DROP COLUMN "category_id";
ALTER TABLE "categories" DROP COLUMN "user_id";
ALTER TABLE "categories" RENAME COLUMN "category_id_uuid" TO "category_id";
ALTER TABLE "categories" RENAME COLUMN "user_id_uuid" TO "user_id";

ALTER TABLE "transactions" DROP COLUMN "transaction_id";
ALTER TABLE "transactions" DROP COLUMN "user_id";
ALTER TABLE "transactions" DROP COLUMN "wallet_id";
ALTER TABLE "transactions" DROP COLUMN "to_wallet_id";
ALTER TABLE "transactions" DROP COLUMN "category_id";
ALTER TABLE "transactions" DROP COLUMN "ai_suggested_category_id";
ALTER TABLE "transactions" RENAME COLUMN "transaction_id_uuid" TO "transaction_id";
ALTER TABLE "transactions" RENAME COLUMN "user_id_uuid" TO "user_id";
ALTER TABLE "transactions" RENAME COLUMN "wallet_id_uuid" TO "wallet_id";
ALTER TABLE "transactions" RENAME COLUMN "to_wallet_id_uuid" TO "to_wallet_id";
ALTER TABLE "transactions" RENAME COLUMN "category_id_uuid" TO "category_id";
ALTER TABLE "transactions" RENAME COLUMN "ai_suggested_category_id_uuid" TO "ai_suggested_category_id";

ALTER TABLE "receipts" DROP COLUMN "receipt_id";
ALTER TABLE "receipts" DROP COLUMN "user_id";
ALTER TABLE "receipts" DROP COLUMN "transaction_id";
ALTER TABLE "receipts" RENAME COLUMN "receipt_id_uuid" TO "receipt_id";
ALTER TABLE "receipts" RENAME COLUMN "user_id_uuid" TO "user_id";
ALTER TABLE "receipts" RENAME COLUMN "transaction_id_uuid" TO "transaction_id";

ALTER TABLE "budgets" DROP COLUMN "budget_id";
ALTER TABLE "budgets" DROP COLUMN "user_id";
ALTER TABLE "budgets" DROP COLUMN "category_id";
ALTER TABLE "budgets" RENAME COLUMN "budget_id_uuid" TO "budget_id";
ALTER TABLE "budgets" RENAME COLUMN "user_id_uuid" TO "user_id";
ALTER TABLE "budgets" RENAME COLUMN "category_id_uuid" TO "category_id";

ALTER TABLE "notifications" DROP COLUMN "notification_id";
ALTER TABLE "notifications" DROP COLUMN "user_id";
ALTER TABLE "notifications" DROP COLUMN "related_transaction_id";
ALTER TABLE "notifications" RENAME COLUMN "notification_id_uuid" TO "notification_id";
ALTER TABLE "notifications" RENAME COLUMN "user_id_uuid" TO "user_id";
ALTER TABLE "notifications" RENAME COLUMN "related_transaction_id_uuid" TO "related_transaction_id";

ALTER TABLE "financial_insights" DROP COLUMN "financial_insights_id";
ALTER TABLE "financial_insights" DROP COLUMN "user_id";
ALTER TABLE "financial_insights" RENAME COLUMN "financial_insights_id_uuid" TO "financial_insights_id";
ALTER TABLE "financial_insights" RENAME COLUMN "user_id_uuid" TO "user_id";

ALTER TABLE "ai_chat_sessions" DROP COLUMN "ai_chat_session_id";
ALTER TABLE "ai_chat_sessions" DROP COLUMN "user_id";
ALTER TABLE "ai_chat_sessions" RENAME COLUMN "ai_chat_session_id_uuid" TO "ai_chat_session_id";
ALTER TABLE "ai_chat_sessions" RENAME COLUMN "user_id_uuid" TO "user_id";

ALTER TABLE "ai_chat_messages" DROP COLUMN "ai_chat_mess_id";
ALTER TABLE "ai_chat_messages" DROP COLUMN "session_id";
ALTER TABLE "ai_chat_messages" RENAME COLUMN "ai_chat_mess_id_uuid" TO "ai_chat_mess_id";
ALTER TABLE "ai_chat_messages" RENAME COLUMN "session_id_uuid" TO "session_id";

ALTER TABLE "users" ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "wallets"
ALTER COLUMN "wallet_id" SET NOT NULL,
ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "categories"
ALTER COLUMN "category_id" SET NOT NULL,
ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "transactions"
ALTER COLUMN "transaction_id" SET NOT NULL,
ALTER COLUMN "user_id" SET NOT NULL,
ALTER COLUMN "wallet_id" SET NOT NULL;

ALTER TABLE "receipts"
ALTER COLUMN "receipt_id" SET NOT NULL,
ALTER COLUMN "user_id" SET NOT NULL,
ALTER COLUMN "transaction_id" SET NOT NULL;

ALTER TABLE "budgets"
ALTER COLUMN "budget_id" SET NOT NULL,
ALTER COLUMN "user_id" SET NOT NULL,
ALTER COLUMN "category_id" SET NOT NULL;

ALTER TABLE "notifications"
ALTER COLUMN "notification_id" SET NOT NULL,
ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "financial_insights"
ALTER COLUMN "financial_insights_id" SET NOT NULL,
ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "ai_chat_sessions"
ALTER COLUMN "ai_chat_session_id" SET NOT NULL,
ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "ai_chat_messages"
ALTER COLUMN "ai_chat_mess_id" SET NOT NULL,
ALTER COLUMN "session_id" SET NOT NULL;

ALTER TABLE "users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("user_id");
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_pkey" PRIMARY KEY ("wallet_id");
ALTER TABLE "categories" ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("category_id");
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("transaction_id");
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_pkey" PRIMARY KEY ("receipt_id");
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_pkey" PRIMARY KEY ("budget_id");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id");
ALTER TABLE "financial_insights" ADD CONSTRAINT "financial_insights_pkey" PRIMARY KEY ("financial_insights_id");
ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_pkey" PRIMARY KEY ("ai_chat_session_id");
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_pkey" PRIMARY KEY ("ai_chat_mess_id");

ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("wallet_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_to_wallet_id_fkey" FOREIGN KEY ("to_wallet_id") REFERENCES "wallets"("wallet_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_ai_suggested_category_id_fkey" FOREIGN KEY ("ai_suggested_category_id") REFERENCES "categories"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("transaction_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_transaction_id_fkey" FOREIGN KEY ("related_transaction_id") REFERENCES "transactions"("transaction_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_insights" ADD CONSTRAINT "financial_insights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "ai_chat_sessions"("ai_chat_session_id") ON DELETE RESTRICT ON UPDATE CASCADE;
