-- AlterTable
ALTER TABLE "User" ADD COLUMN "telegramChatId" TEXT;
ALTER TABLE "User" ADD COLUMN "telegramLinkCode" TEXT;
ALTER TABLE "User" ADD COLUMN "telegramLinkCodeExpiresAt" DATETIME;

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramChatId_key" ON "User"("telegramChatId");

-- CreateIndex
CREATE INDEX "User_telegramLinkCode_idx" ON "User"("telegramLinkCode");
