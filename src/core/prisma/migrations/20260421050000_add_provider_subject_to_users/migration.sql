-- AlterTable
ALTER TABLE "users" ADD COLUMN "provider_subject" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "users_provider_provider_subject_key" ON "users"("provider", "provider_subject");
