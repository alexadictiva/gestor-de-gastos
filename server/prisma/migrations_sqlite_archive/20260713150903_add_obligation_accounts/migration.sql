-- CreateTable
CREATE TABLE "ObligationAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "creditLimit" REAL,
    "closingDay" INTEGER,
    "dueDay" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "ObligationAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Obligation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "referenceMonth" TEXT,
    "principalAmount" REAL NOT NULL,
    "interestAmount" REAL NOT NULL DEFAULT 0,
    "minimumPayment" REAL,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "accountId" TEXT NOT NULL,
    CONSTRAINT "Obligation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ObligationAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ObligationPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" REAL NOT NULL,
    "paymentDate" DATETIME NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "obligationId" TEXT NOT NULL,
    CONSTRAINT "ObligationPayment_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "Obligation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ObligationAccount_userId_idx" ON "ObligationAccount"("userId");

-- CreateIndex
CREATE INDEX "Obligation_accountId_idx" ON "Obligation"("accountId");

-- CreateIndex
CREATE INDEX "Obligation_dueDate_idx" ON "Obligation"("dueDate");

-- CreateIndex
CREATE INDEX "Obligation_status_idx" ON "Obligation"("status");

-- CreateIndex
CREATE INDEX "ObligationPayment_obligationId_idx" ON "ObligationPayment"("obligationId");

-- CreateIndex
CREATE INDEX "ObligationPayment_paymentDate_idx" ON "ObligationPayment"("paymentDate");
