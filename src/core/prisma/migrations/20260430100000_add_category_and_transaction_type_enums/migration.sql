CREATE TYPE "CategoryType" AS ENUM ('INCOME', 'EXPENSE');

CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');

ALTER TABLE "categories"
ALTER COLUMN "type" TYPE "CategoryType"
USING "type"::"CategoryType";

ALTER TABLE "transactions"
ALTER COLUMN "type" TYPE "TransactionType"
USING "type"::"TransactionType";
