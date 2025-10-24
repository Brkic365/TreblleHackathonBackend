/*
  Warnings:

  - You are about to drop the column `originalBaseUrl` on the `ApiEndpoint` table. All the data in the column will be lost.
  - You are about to drop the column `proxyUrl` on the `ApiEndpoint` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `ApiEndpoint` table. All the data in the column will be lost.
  - Added the required column `projectId` to the `ApiEndpoint` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "originalBaseUrl" TEXT NOT NULL,
    "proxyUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ApiEndpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "ApiEndpoint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ApiEndpoint" ("createdAt", "id", "method", "name", "path") SELECT "createdAt", "id", "method", "name", "path" FROM "ApiEndpoint";
DROP TABLE "ApiEndpoint";
ALTER TABLE "new_ApiEndpoint" RENAME TO "ApiEndpoint";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Project_proxyUrl_key" ON "Project"("proxyUrl");
