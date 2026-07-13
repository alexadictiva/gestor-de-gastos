-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PlannedMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'not_specified',
    "dueDate" DATETIME NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" DATETIME,
    "linkedTransactionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "PlannedMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PlannedMovement" ("amount", "category", "createdAt", "dueDate", "id", "isRecurring", "paymentMethod", "title", "type", "updatedAt", "userId") SELECT "amount", "category", "createdAt", "dueDate", "id", "isRecurring", "paymentMethod", "title", "type", "updatedAt", "userId" FROM "PlannedMovement";
DROP TABLE "PlannedMovement";
ALTER TABLE "new_PlannedMovement" RENAME TO "PlannedMovement";
CREATE INDEX "PlannedMovement_userId_idx" ON "PlannedMovement"("userId");
CREATE INDEX "PlannedMovement_dueDate_idx" ON "PlannedMovement"("dueDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
