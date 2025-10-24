-- CreateTable
CREATE TABLE "AnalyticsAggregation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apiEndpointId" TEXT NOT NULL,
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
    CONSTRAINT "AnalyticsAggregation_apiEndpointId_fkey" FOREIGN KEY ("apiEndpointId") REFERENCES "ApiEndpoint" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AnalyticsAggregation_apiEndpointId_date_idx" ON "AnalyticsAggregation"("apiEndpointId", "date");

-- CreateIndex
CREATE INDEX "AnalyticsAggregation_date_idx" ON "AnalyticsAggregation"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsAggregation_apiEndpointId_date_hour_key" ON "AnalyticsAggregation"("apiEndpointId", "date", "hour");
