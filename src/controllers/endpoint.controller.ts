// src/controllers/endpoint.controller.ts

import type { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

// --- GET all Endpoints for a Project ---
export const getProjectEndpoints = async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const userId = req.user?.userId;

    // Parse query parameters
    const method = req.query['method'] as string || 'all';
    const status = req.query['status'] as string || 'all';
    const timeRange = req.query['timeRange'] as string || '24h';
    const sortBy = req.query['sortBy'] as string || 'path';
    const order = req.query['order'] as 'asc' | 'desc' || 'asc';

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }

    if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required.' });
    }

    try {
        // Security check: Ensure user owns the project
        const project = await prisma.project.findFirst({
            where: { id: projectId, userId: userId },
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found or you do not have access.' });
        }

        // Calculate time range filter
        const getTimeRangeMs = (timeRange: string): number => {
            const timeRanges = {
                '1h': 60 * 60 * 1000,
                '24h': 24 * 60 * 60 * 1000,
                '7d': 7 * 24 * 60 * 60 * 1000,
                '30d': 30 * 24 * 60 * 60 * 1000,
            };
            return timeRanges[timeRange as keyof typeof timeRanges] || timeRanges['24h'];
        };

        const timeRangeMs = getTimeRangeMs(timeRange);
        const startTime = new Date(Date.now() - timeRangeMs);

        // Build where clause for request logs
        const whereClause: any = { 
            projectId,
            createdAt: { gte: startTime }
        };

        // Add method filter if not 'all'
        if (method && method !== 'all') {
            whereClause.method = method;
        }

        // Get unique endpoints from request logs
        const requestLogs = await prisma.apiRequestLog.findMany({
            where: whereClause,
            select: {
                method: true,
                path: true,
                createdAt: true,
                responseCode: true,
                durationMs: true,
            },
            orderBy: { createdAt: 'desc' }
        });

        // Group by method + path to get unique endpoints
        const endpointMap = new Map<string, any>();
        
        requestLogs.forEach((log: any) => {
            const key = `${log.method}:${log.path}`;
            if (!endpointMap.has(key)) {
                endpointMap.set(key, {
                    method: log.method,
                    path: log.path,
                    requestCount: 0,
                    errorCount: 0,
                    avgResponseTime: 0,
                    lastRequest: log.createdAt,
                    responseTimes: []
                });
            }
            
            const endpoint = endpointMap.get(key);
            endpoint.requestCount++;
            endpoint.responseTimes.push(log.durationMs || 0);
            
            if (log.responseCode && log.responseCode >= 400) {
                endpoint.errorCount++;
            }
            
            if (log.createdAt > endpoint.lastRequest) {
                endpoint.lastRequest = log.createdAt;
            }
        });

        // Calculate metrics for each endpoint
        let endpoints = Array.from(endpointMap.values()).map(endpoint => ({
            method: endpoint.method,
            path: endpoint.path,
            requestCount: endpoint.requestCount,
            errorRate: endpoint.requestCount > 0 ? (endpoint.errorCount / endpoint.requestCount) * 100 : 0,
            avgResponseTime: endpoint.responseTimes.length > 0 
                ? Math.round(endpoint.responseTimes.reduce((sum: number, time: number) => sum + time, 0) / endpoint.responseTimes.length)
                : 0,
            lastRequest: endpoint.lastRequest,
            status: endpoint.errorCount > 0 ? 'error' : 'healthy'
        }));

        // Apply status filter
        if (status && status !== 'all') {
            endpoints = endpoints.filter(endpoint => endpoint.status === status);
        }

        // Apply sorting
        endpoints.sort((a, b) => {
            let aValue: any, bValue: any;
            
            switch (sortBy) {
                case 'method':
                    aValue = a.method;
                    bValue = b.method;
                    break;
                case 'requestCount':
                    aValue = a.requestCount;
                    bValue = b.requestCount;
                    break;
                case 'errorRate':
                    aValue = a.errorRate;
                    bValue = b.errorRate;
                    break;
                case 'avgResponseTime':
                    aValue = a.avgResponseTime;
                    bValue = b.avgResponseTime;
                    break;
                case 'lastRequest':
                    aValue = new Date(a.lastRequest).getTime();
                    bValue = new Date(b.lastRequest).getTime();
                    break;
                default: // path
                    aValue = a.path;
                    bValue = b.path;
            }

            if (order === 'desc') {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            } else {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            }
        });

        res.json({
            endpoints,
            pagination: {
                page: 1,
                limit: endpoints.length,
                total: endpoints.length,
                totalPages: 1,
                hasNext: false,
                hasPrev: false,
            }
        });
        return;

    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch project endpoints: ' + error });
        return;
    }
};
