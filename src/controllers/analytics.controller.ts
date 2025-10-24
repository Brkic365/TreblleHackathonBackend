// src/controllers/analytics.controller.ts

import type { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { getAnalyticsData } from '../services/analytics.service.js';

export const getAnalytics = async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { startDate, endDate, projectIds } = req.query;

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Get user's projects and their endpoints
        const projects = await prisma.project.findMany({
            where: { userId },
            include: { endpoints: { select: { id: true, name: true } } }
        });

        const endpoints = projects.flatMap(project => 
            project.endpoints.map(endpoint => ({ ...endpoint, projectId: project.id }))
        );

        const endpointIds = projectIds 
            ? (projectIds as string).split(',').filter(id => 
                endpoints.some(ep => ep.id === id)
              )
            : endpoints.map(ep => ep.id);

        if (endpointIds.length === 0) {
            return res.json({
                kpis: { totalRequests: 0, avgLatency: 0, errorRate: 0 },
                projectPerformance: [],
                requestsOverTime: [],
            });
        }

        // Build date filter
        const start = startDate ? new Date(startDate as string) : undefined;
        const end = endDate ? new Date(endDate as string) : undefined;

        // Get aggregated analytics data for all endpoints
        const analyticsData = await Promise.all(
            endpointIds.map(async (endpointId) => {
                const data = await getAnalyticsData(endpointId, start, end);
                return { endpointId, data };
            })
        );

        // Calculate KPIs across all endpoints
        let totalRequests = 0;
        let totalErrorRequests = 0;
        let totalResponseTime = 0;
        let totalResponseTimeCount = 0;

        analyticsData.forEach(({ data }) => {
            data.forEach((aggregation: any) => {
                totalRequests += aggregation.totalRequests;
                totalErrorRequests += aggregation.errorRequests;
                if (aggregation.avgResponseTime) {
                    totalResponseTime += aggregation.avgResponseTime * aggregation.totalRequests;
                    totalResponseTimeCount += aggregation.totalRequests;
                }
            });
        });

        const avgLatency = totalResponseTimeCount > 0 ? totalResponseTime / totalResponseTimeCount : 0;
        const errorRate = totalRequests > 0 ? totalErrorRequests / totalRequests : 0;

        // Project performance data
        const projectPerformance = analyticsData.map(({ endpointId, data }) => {
            const endpoint = endpoints.find(ep => ep.id === endpointId);
            const totalRequests = data.reduce((sum: number, agg: any) => sum + agg.totalRequests, 0);
            const totalErrors = data.reduce((sum: number, agg: any) => sum + agg.errorRequests, 0);
            const avgResponseTime = data.length > 0 
                ? data.reduce((sum: number, agg: any) => sum + (agg.avgResponseTime || 0) * agg.totalRequests, 0) / totalRequests
                : 0;

            return {
                endpointId,
                name: endpoint?.name || 'Unknown',
                totalRequests,
                errorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
                avgLatency: avgResponseTime,
            };
        });

        // Requests over time (daily aggregation)
        const requestsOverTime = analyticsData
            .flatMap(({ data }) => data.filter((agg: any) => agg.hour === null)) // Only daily aggregations
            .reduce((acc: Record<string, { date: string; requests: number }>, agg: any) => {
                const dateKey = agg.date.toISOString().split('T')[0];
                if (!acc[dateKey]) {
                    acc[dateKey] = { date: dateKey, requests: 0 };
                }
                acc[dateKey].requests += agg.totalRequests;
                return acc;
            }, {});

        res.json({
            kpis: {
                totalRequests,
                avgLatency: Math.round(avgLatency),
                errorRate: Math.round(errorRate * 100) / 100,
            },
            projectPerformance,
            requestsOverTime: Object.values(requestsOverTime).sort((a: any, b: any) => 
                new Date(a.date).getTime() - new Date(b.date).getTime()
            ),
        });
        return;

    } catch (error) {
        console.error("Error fetching analytics:", error);
        res.status(500).json({ error: 'Failed to fetch analytics data.' });
        return;
    }
};