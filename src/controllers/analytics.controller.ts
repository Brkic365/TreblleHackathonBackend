// src/controllers/analytics.controller.ts

import type { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

export const getAnalytics = async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { startDate, endDate, projectIds } = req.query;

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Parse date filters
        const start = startDate ? new Date(startDate as string) : undefined;
        const end = endDate ? new Date(endDate as string) : undefined;

        // Parse project IDs filter (comma-separated)
        const requestedProjectIds = projectIds 
            ? (projectIds as string).split(',').map(id => id.trim())
            : undefined;

        // Get user's projects (security: only user's own projects)
        const whereClause: any = { userId };
        if (requestedProjectIds && requestedProjectIds.length > 0) {
            whereClause.id = { in: requestedProjectIds };
        }

        const userProjects = await prisma.project.findMany({
            where: whereClause,
            select: { id: true }
        });

        if (userProjects.length === 0) {
            return res.json({
                kpis: { totalRequests: 0, avgLatency: 0 },
                projectPerformance: [],
                requestsOverTime: []
            });
        }

        const allowedProjectIds = userProjects.map(p => p.id);

        // Build date filter for request logs
        const requestLogWhere: any = {
            projectId: { in: allowedProjectIds }
        };

        if (start || end) {
            requestLogWhere.createdAt = {};
            if (start) requestLogWhere.createdAt.gte = start;
            if (end) requestLogWhere.createdAt.lte = end;
        }

        // Get aggregate KPIs
        const [totalRequests, avgLatency, requestLogs] = await Promise.all([
            prisma.apiRequestLog.count({ where: requestLogWhere }),
            prisma.apiRequestLog.aggregate({
                where: requestLogWhere,
                _avg: { durationMs: true }
            }),
            prisma.apiRequestLog.findMany({
                where: requestLogWhere,
                select: {
                    projectId: true,
                    durationMs: true,
                    responseCode: true,
                    createdAt: true
                }
            })
        ]);

        // Calculate KPIs
        const kpis = {
            totalRequests,
            avgLatency: avgLatency._avg.durationMs ? Math.round(avgLatency._avg.durationMs) : 0
        };

        // Group by projectId for projectPerformance
        const projectPerformanceMap = new Map<string, { durations: number[], errorCount: number }>();

        requestLogs.forEach(log => {
            const projectId = log.projectId;
            if (!projectPerformanceMap.has(projectId)) {
                projectPerformanceMap.set(projectId, { durations: [], errorCount: 0 });
            }
            const stats = projectPerformanceMap.get(projectId)!;
            
            if (log.durationMs !== null) {
                stats.durations.push(log.durationMs);
            }
            if (log.responseCode && log.responseCode >= 400) {
                stats.errorCount++;
            }
        });

        const projectPerformance = Array.from(projectPerformanceMap.entries()).map(([apiEndpointId, stats]) => {
            const avgDuration = stats.durations.length > 0
                ? stats.durations.reduce((sum, d) => sum + d, 0) / stats.durations.length
                : 0;

            return {
                apiEndpointId,
                _avg: {
                    durationMs: Math.round(avgDuration)
                },
                _count: {
                    id: stats.durations.length,
                    error: stats.errorCount
                }
            };
        });

        // Group requestsOverTime by day
        const requestsOverTimeMap = new Map<string, number>();

        requestLogs.forEach(log => {
            const dayKey = log.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
            requestsOverTimeMap.set(dayKey, (requestsOverTimeMap.get(dayKey) || 0) + 1);
        });

        const requestsOverTime = Array.from(requestsOverTimeMap.entries())
            .map(([createdAt, count]) => ({
                createdAt: `${createdAt}T00:00:00.000Z`,
                _count: {
                    id: count
                }
            }))
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

        res.json({
            kpis,
            projectPerformance,
            requestsOverTime
        });

    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics data.' });
    }
};

