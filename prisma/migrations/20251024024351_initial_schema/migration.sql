-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ApiEndpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "originalBaseUrl" TEXT NOT NULL,
    "proxyUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "ApiEndpoint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiRequestLog" (
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
    "apiEndpointId" TEXT NOT NULL,
    CONSTRAINT "ApiRequestLog_apiEndpointId_fkey" FOREIGN KEY ("apiEndpointId") REFERENCES "ApiEndpoint" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SecurityIssue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "recommendation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "apiEndpointId" TEXT NOT NULL,
    CONSTRAINT "SecurityIssue_apiEndpointId_fkey" FOREIGN KEY ("apiEndpointId") REFERENCES "ApiEndpoint" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ApiEndpoint_proxyUrl_key" ON "ApiEndpoint"("proxyUrl");

-- CreateIndex
CREATE INDEX "ApiRequestLog_apiEndpointId_createdAt_idx" ON "ApiRequestLog"("apiEndpointId", "createdAt");

-- CreateIndex
CREATE INDEX "ApiRequestLog_responseCode_idx" ON "ApiRequestLog"("responseCode");

-- CreateIndex
CREATE INDEX "ApiRequestLog_createdAt_idx" ON "ApiRequestLog"("createdAt");

-- CreateIndex
CREATE INDEX "SecurityIssue_apiEndpointId_createdAt_idx" ON "SecurityIssue"("apiEndpointId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityIssue_severity_idx" ON "SecurityIssue"("severity");
