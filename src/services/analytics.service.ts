// src/services/analytics.service.ts

import { prisma } from '../config/prisma.js';

interface RequestMetrics {
    projectId: string;
    durationMs: number;
    requestSize: number;
    responseSize: number;
    responseCode: number;
    securityScore: number;
    securityIssues: any[];
    ipAddress: string;
    country?: string;
}

/**
 * Updates analytics aggregations for a given request
 * This runs in the background to avoid blocking the main request
 */
export const updateAnalyticsAggregation = async (metrics: RequestMetrics): Promise<void> => {
    setImmediate(async () => {
        try {
            const now = new Date();
            const date = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of day
            const hour = now.getHours();

            // Check if aggregation record exists for this project, date, and hour
            const existingAggregation = await prisma.analyticsAggregation.findUnique({
                where: {
                    projectId_date_hour: {
                        projectId: metrics.projectId,
                        date: date,
                        hour: hour,
                    }
                }
            });

            // Calculate new metrics
            const isError = metrics.responseCode >= 400;
            const criticalIssues = metrics.securityIssues.filter((issue: any) => issue.severity === 'CRITICAL').length;
            const highIssues = metrics.securityIssues.filter((issue: any) => issue.severity === 'HIGH').length;

            if (existingAggregation) {
                // Update existing aggregation
                const newTotalRequests = existingAggregation.totalRequests + 1;
                const newErrorRequests = existingAggregation.errorRequests + (isError ? 1 : 0);
                const newCriticalIssues = existingAggregation.criticalIssues + criticalIssues;
                const newHighIssues = existingAggregation.highIssues + highIssues;

                // Calculate new averages
                const newAvgResponseTime = existingAggregation.avgResponseTime 
                    ? (existingAggregation.avgResponseTime * existingAggregation.totalRequests + metrics.durationMs) / newTotalRequests
                    : metrics.durationMs;

                const newAvgSecurityScore = existingAggregation.avgSecurityScore
                    ? (existingAggregation.avgSecurityScore * existingAggregation.totalRequests + metrics.securityScore) / newTotalRequests
                    : metrics.securityScore;

                await prisma.analyticsAggregation.update({
                    where: { id: existingAggregation.id },
                    data: {
                        totalRequests: newTotalRequests,
                        errorRequests: newErrorRequests,
                        avgResponseTime: newAvgResponseTime,
                        avgSecurityScore: newAvgSecurityScore,
                        criticalIssues: newCriticalIssues,
                        highIssues: newHighIssues,
                        totalRequestSize: existingAggregation.totalRequestSize + metrics.requestSize,
                        totalResponseSize: existingAggregation.totalResponseSize + metrics.responseSize,
                        minResponseTime: existingAggregation.minResponseTime 
                            ? Math.min(existingAggregation.minResponseTime, metrics.durationMs)
                            : metrics.durationMs,
                        maxResponseTime: existingAggregation.maxResponseTime
                            ? Math.max(existingAggregation.maxResponseTime, metrics.durationMs)
                            : metrics.durationMs,
                        updatedAt: now,
                    }
                });
            } else {
                // Create new aggregation record
                await prisma.analyticsAggregation.create({
                    data: {
                        projectId: metrics.projectId,
                        date: date,
                        hour: hour,
                        totalRequests: 1,
                        errorRequests: isError ? 1 : 0,
                        avgResponseTime: metrics.durationMs,
                        minResponseTime: metrics.durationMs,
                        maxResponseTime: metrics.durationMs,
                        avgSecurityScore: metrics.securityScore,
                        criticalIssues: criticalIssues,
                        highIssues: highIssues,
                        totalRequestSize: metrics.requestSize,
                        totalResponseSize: metrics.responseSize,
                        uniqueIPs: 1, // We'll need to track this more sophisticatedly
                        uniqueCountries: metrics.country ? 1 : 0,
                    }
                });
            }

            // Also update daily aggregation (without hour)
            const dailyAggregation = await prisma.analyticsAggregation.findFirst({
                where: {
                    projectId: metrics.projectId,
                    date: date,
                    hour: null,
                }
            });

            if (dailyAggregation) {
                const newTotalRequests = dailyAggregation.totalRequests + 1;
                const newErrorRequests = dailyAggregation.errorRequests + (isError ? 1 : 0);
                const newCriticalIssues = dailyAggregation.criticalIssues + criticalIssues;
                const newHighIssues = dailyAggregation.highIssues + highIssues;

                const newAvgResponseTime = dailyAggregation.avgResponseTime 
                    ? (dailyAggregation.avgResponseTime * dailyAggregation.totalRequests + metrics.durationMs) / newTotalRequests
                    : metrics.durationMs;

                const newAvgSecurityScore = dailyAggregation.avgSecurityScore
                    ? (dailyAggregation.avgSecurityScore * dailyAggregation.totalRequests + metrics.securityScore) / newTotalRequests
                    : metrics.securityScore;

                await prisma.analyticsAggregation.update({
                    where: { id: dailyAggregation.id },
                    data: {
                        totalRequests: newTotalRequests,
                        errorRequests: newErrorRequests,
                        avgResponseTime: newAvgResponseTime,
                        avgSecurityScore: newAvgSecurityScore,
                        criticalIssues: newCriticalIssues,
                        highIssues: newHighIssues,
                        totalRequestSize: dailyAggregation.totalRequestSize + metrics.requestSize,
                        totalResponseSize: dailyAggregation.totalResponseSize + metrics.responseSize,
                        minResponseTime: dailyAggregation.minResponseTime 
                            ? Math.min(dailyAggregation.minResponseTime, metrics.durationMs)
                            : metrics.durationMs,
                        maxResponseTime: dailyAggregation.maxResponseTime
                            ? Math.max(dailyAggregation.maxResponseTime, metrics.durationMs)
                            : metrics.durationMs,
                        updatedAt: now,
                    }
                });
            } else {
                await prisma.analyticsAggregation.create({
                    data: {
                        projectId: metrics.projectId,
                        date: date,
                        hour: null, // Daily aggregation
                        totalRequests: 1,
                        errorRequests: isError ? 1 : 0,
                        avgResponseTime: metrics.durationMs,
                        minResponseTime: metrics.durationMs,
                        maxResponseTime: metrics.durationMs,
                        avgSecurityScore: metrics.securityScore,
                        criticalIssues: criticalIssues,
                        highIssues: highIssues,
                        totalRequestSize: metrics.requestSize,
                        totalResponseSize: metrics.responseSize,
                        uniqueIPs: 1,
                        uniqueCountries: metrics.country ? 1 : 0,
                    }
                });
            }

        } catch (error) {
            console.error('[Analytics Service] Failed to update analytics aggregation:', error);
        }
    });
};

/**
 * Gets analytics data for a specific endpoint and date range
 */
export const getAnalyticsData = async (
    endpointId: string, 
    startDate?: Date, 
    endDate?: Date
) => {
    const where: any = { apiEndpointId: endpointId };
    
    if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = startDate;
        if (endDate) where.date.lte = endDate;
    }

    return await prisma.analyticsAggregation.findMany({
        where,
        orderBy: { date: 'asc' },
    });
};
