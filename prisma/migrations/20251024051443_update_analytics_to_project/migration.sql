/*
  Warnings:

  - You are about to drop the column `apiEndpointId` on the `AnalyticsAggregation` table. All the data in the column will be lost.
  - Added the required column `projectId` to the `AnalyticsAggregation` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AnalyticsAggregation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "hour" INTEGER,
    "totalRequests" INTEGER NOT NULL DEFAULT 0,
    "errorRequests" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTime" REAL,
    "minResponseTime" REAL,
    "maxResponseTime" REAL,
    "totalRequestSize" INTEGER NOT NULL DEFAULT 0,
    "totalResponseSize" INTEGER NOT NULL DEFAULT 0,
    "avgSecurityScore" REAL,
    "criticalIssues" INTEGER NOT NULL DEFAULT 0,
    "highIssues" INTEGER NOT NULL DEFAULT 0,
    "uniqueIPs" INTEGER NOT NULL DEFAULT 0,
    "uniqueCountries" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AnalyticsAggregation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AnalyticsAggregation" ("avgResponseTime", "avgSecurityScore", "createdAt", "criticalIssues", "date", "errorRequests", "highIssues", "hour", "id", "maxResponseTime", "minResponseTime", "totalRequestSize", "totalRequests", "totalResponseSize", "uniqueCountries", "uniqueIPs", "updatedAt") SELECT "avgResponseTime", "avgSecurityScore", "createdAt", "criticalIssues", "date", "errorRequests", "highIssues", "hour", "id", "maxResponseTime", "minResponseTime", "totalRequestSize", "totalRequests", "totalResponseSize", "uniqueCountries", "uniqueIPs", "updatedAt" FROM "AnalyticsAggregation";
DROP TABLE "AnalyticsAggregation";
ALTER TABLE "new_AnalyticsAggregation" RENAME TO "AnalyticsAggregation";
CREATE INDEX "AnalyticsAggregation_projectId_date_idx" ON "AnalyticsAggregation"("projectId", "date");
CREATE INDEX "AnalyticsAggregation_date_idx" ON "AnalyticsAggregation"("date");
CREATE UNIQUE INDEX "AnalyticsAggregation_projectId_date_hour_key" ON "AnalyticsAggregation"("projectId", "date", "hour");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
