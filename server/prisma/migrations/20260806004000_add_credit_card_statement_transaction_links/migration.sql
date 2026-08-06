ALTER TABLE "Transaction"
ADD COLUMN "linkedObligationId" TEXT;

ALTER TABLE "Obligation"
ADD COLUMN "sourceType" TEXT;

CREATE INDEX "Transaction_linkedObligationId_idx" ON "Transaction"("linkedObligationId");

CREATE INDEX "Obligation_accountId_referenceMonth_sourceType_idx"
ON "Obligation"("accountId", "referenceMonth", "sourceType");

ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_linkedObligationId_fkey"
FOREIGN KEY ("linkedObligationId") REFERENCES "Obligation"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
