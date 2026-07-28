-- CreateTable
CREATE TABLE "PlannedMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'not_specified',
    "dueDate" DATETIME NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "PlannedMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PlannedMovement_userId_idx" ON "PlannedMovement"("userId");

-- CreateIndex
CREATE INDEX "PlannedMovement_dueDate_idx" ON "PlannedMovement"("dueDate");
