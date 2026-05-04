ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_linked_transaction_id_fkey";

ALTER TABLE "transactions" DROP COLUMN IF EXISTS "linked_transaction_id";
