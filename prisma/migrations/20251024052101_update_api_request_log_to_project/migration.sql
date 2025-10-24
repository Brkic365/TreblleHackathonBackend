/*
  Warnings:

  - You are about to drop the column `apiEndpointId` on the `ApiRequestLog` table. All the data in the column will be lost.
  - Added the required column `projectId` to the `ApiRequestLog` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ApiRequestLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "responseCode" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER,
    "requestSize" INTEGER,
    "responseSize" INTEGER,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "requestHeaders" JSONB,
    "requestBody" TEXT,
    "queryParams" JSONB,
    "responseHeaders" JSONB,
    "responseBody" TEXT,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "securityScore" INTEGER,
    "securityIssues" JSONB,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "ApiRequestLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ApiRequestLog" ("city", "country", "createdAt", "durationMs", "id", "ipAddress", "latitude", "longitude", "method", "path", "queryParams", "region", "requestBody", "requestHeaders", "requestSize", "responseBody", "responseCode", "responseHeaders", "responseSize", "securityIssues", "securityScore", "userAgent") SELECT "city", "country", "createdAt", "durationMs", "id", "ipAddress", "latitude", "longitude", "method", "path", "queryParams", "region", "requestBody", "requestHeaders", "requestSize", "responseBody", "responseCode", "responseHeaders", "responseSize", "securityIssues", "securityScore", "userAgent" FROM "ApiRequestLog";
DROP TABLE "ApiRequestLog";
ALTER TABLE "new_ApiRequestLog" RENAME TO "ApiRequestLog";
CREATE INDEX "ApiRequestLog_projectId_createdAt_idx" ON "ApiRequestLog"("projectId", "createdAt");
CREATE INDEX "ApiRequestLog_responseCode_idx" ON "ApiRequestLog"("responseCode");
CREATE INDEX "ApiRequestLog_createdAt_idx" ON "ApiRequestLog"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
