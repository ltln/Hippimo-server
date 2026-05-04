ALTER TABLE "transactions" ADD COLUMN "to_wallet_id" INTEGER;

ALTER TABLE "transactions" ALTER COLUMN "category_id" DROP NOT NULL;

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_to_wallet_id_fkey"
FOREIGN KEY ("to_wallet_id") REFERENCES "wallets"("wallet_id")
ON DELETE SET NULL ON UPDATE CASCADE;
