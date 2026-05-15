-- CreateEnum
CREATE TYPE "BudgetPeriodType" AS ENUM ('WEEK', 'MONTH', 'YEAR');

-- AlterTable
ALTER TABLE "budgets"
ADD COLUMN "period_type" "BudgetPeriodType",
ADD COLUMN "period_start" TIMESTAMP(3),
ADD COLUMN "period_end" TIMESTAMP(3);

ALTER TABLE "budgets" ALTER COLUMN "period_type" SET NOT NULL;
ALTER TABLE "budgets" ALTER COLUMN "period_start" SET NOT NULL;
ALTER TABLE "budgets" ALTER COLUMN "period_end" SET NOT NULL;

ALTER TABLE "budgets" DROP COLUMN "month";
ALTER TABLE "budgets" DROP COLUMN "year";

CREATE UNIQUE INDEX "budgets_user_category_period_unique"
ON "budgets"("user_id", "category_id", "period_type", "period_start");
