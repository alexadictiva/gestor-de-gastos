-- CreateTable
CREATE TABLE "FinancialAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "initialBalance" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "FinancialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ObligationPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" REAL NOT NULL,
    "paymentDate" DATETIME NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'not_specified',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "obligationId" TEXT NOT NULL,
    "financialAccountId" TEXT,
    CONSTRAINT "ObligationPayment_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "Obligation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ObligationPayment_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ObligationPayment" ("amount", "createdAt", "id", "notes", "obligationId", "paymentDate", "paymentMethod", "updatedAt") SELECT "amount", "createdAt", "id", "notes", "obligationId", "paymentDate", "paymentMethod", "updatedAt" FROM "ObligationPayment";
DROP TABLE "ObligationPayment";
ALTER TABLE "new_ObligationPayment" RENAME TO "ObligationPayment";
CREATE INDEX "ObligationPayment_obligationId_idx" ON "ObligationPayment"("obligationId");
CREATE INDEX "ObligationPayment_paymentDate_idx" ON "ObligationPayment"("paymentDate");
CREATE INDEX "ObligationPayment_financialAccountId_idx" ON "ObligationPayment"("financialAccountId");
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'not_specified',
    "reimbursementStatus" TEXT NOT NULL DEFAULT 'not_applicable',
    "date" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "linkedObligationAccountId" TEXT,
    "linkedObligationPaymentId" TEXT,
    "financialAccountId" TEXT,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_linkedObligationAccountId_fkey" FOREIGN KEY ("linkedObligationAccountId") REFERENCES "ObligationAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_linkedObligationPaymentId_fkey" FOREIGN KEY ("linkedObligationPaymentId") REFERENCES "ObligationPayment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("amount", "category", "createdAt", "date", "description", "id", "linkedObligationAccountId", "linkedObligationPaymentId", "paymentMethod", "reimbursementStatus", "type", "updatedAt", "userId") SELECT "amount", "category", "createdAt", "date", "description", "id", "linkedObligationAccountId", "linkedObligationPaymentId", "paymentMethod", "reimbursementStatus", "type", "updatedAt", "userId" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");
CREATE INDEX "Transaction_linkedObligationAccountId_idx" ON "Transaction"("linkedObligationAccountId");
CREATE INDEX "Transaction_linkedObligationPaymentId_idx" ON "Transaction"("linkedObligationPaymentId");
CREATE INDEX "Transaction_financialAccountId_idx" ON "Transaction"("financialAccountId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "FinancialAccount_userId_idx" ON "FinancialAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialAccount_userId_name_key" ON "FinancialAccount"("userId", "name");
