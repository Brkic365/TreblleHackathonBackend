/*
  Warnings:

  - Added the required column `method` to the `ApiEndpoint` table without a default value. This is not possible if the table is not empty.
  - Added the required column `path` to the `ApiEndpoint` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ApiEndpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "originalBaseUrl" TEXT NOT NULL,
    "proxyUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "ApiEndpoint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ApiEndpoint" ("createdAt", "id", "name", "method", "path", "originalBaseUrl", "proxyUrl", "userId") SELECT "createdAt", "id", "name", "GET", "/", "originalBaseUrl", "proxyUrl", "userId" FROM "ApiEndpoint";
DROP TABLE "ApiEndpoint";
ALTER TABLE "new_ApiEndpoint" RENAME TO "ApiEndpoint";
CREATE UNIQUE INDEX "ApiEndpoint_proxyUrl_key" ON "ApiEndpoint"("proxyUrl");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
