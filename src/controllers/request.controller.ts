// src/controllers/request.controller.ts

import type { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

export const getProjectRequests = async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const userId = req.user?.userId;

    // --- Parsing Query Parameters ---
    const page = parseInt(req.query['page'] as string) || 1;
    const limit = parseInt(req.query['limit'] as string) || 20;
    const method = req.query['method'] as string || 'all';
    const statusCode = req.query['statusCode'] as string || 'all'; // e.g., "4xx", "2xx"
    const timeRange = req.query['timeRange'] as string || '24h';
    const sortBy = (req.query['sortBy'] as string) || 'createdAt';
    
    // Map timestamp to createdAt for backward compatibility
    const mappedSortBy = sortBy === 'timestamp' ? 'createdAt' : sortBy;
    const order = req.query['order'] as 'asc' | 'desc' || 'desc';

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // --- Security Check: Ensure user owns the project ---
        if (!projectId) {
            return res.status(400).json({ error: 'Project ID is required.' });
        }
        
        const project = await prisma.project.findFirst({
            where: { id: projectId, userId: userId },
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found or you do not have access.' });
        }

        // --- Calculate Time Range Filter ---
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

        // --- Building Dynamic Prisma Query ---
        const where: any = {
            projectId,
            createdAt: { gte: startTime }
        };

        if (method && method !== 'all') {
            where.method = method;
        }

        if (statusCode && statusCode !== 'all') {
            const codeRange = {
                '2xx': { gte: 200, lt: 300 },
                '4xx': { gte: 400, lt: 500 },
                '5xx': { gte: 500, lt: 600 },
            }[statusCode];
            if (codeRange) {
                where.responseCode = codeRange;
            }
        }
        
        // --- Database Query ---
        const requests = await prisma.apiRequestLog.findMany({
            where,
            orderBy: { [mappedSortBy]: order },
            skip: (page - 1) * limit,
            take: limit,
        });

        // --- Get Total Count for Pagination ---
        const totalRequests = await prisma.apiRequestLog.count({ where });

        // Transform database results to match RequestLog interface
        const transformedRequests = requests.map((request: any) => ({
            id: request.id,
            method: request.method,
            path: request.path,
            statusCode: request.responseCode || 0,
            responseTime: request.durationMs || 0,
            timestamp: request.createdAt.toISOString(),
            ipAddress: request.ipAddress || '',
            location: request.city && request.country ? `${request.city}, ${request.country}` : 'Unknown',
            duration: request.durationMs || 0,
            userAgent: request.userAgent || 'Unknown',
            requestHeaders: request.requestHeaders ? JSON.parse(request.requestHeaders) : {},
            requestBody: request.requestBody ? JSON.parse(request.requestBody) : undefined,
            queryParams: request.queryParams ? JSON.parse(request.queryParams) : {},
            responseHeaders: request.responseHeaders ? JSON.parse(request.responseHeaders) : {},
            responseBody: request.responseBody ? JSON.parse(request.responseBody) : undefined,
            securityScore: request.securityScore || 0,
            securityIssues: request.securityIssues ? JSON.parse(request.securityIssues) : [],
            requestSize: request.requestSize || 0,
            responseSize: request.responseSize || 0,
        }));

        res.json({
            requests: transformedRequests,
            pagination: {
                page,
                limit,
                total: totalRequests,
                totalPages: Math.ceil(totalRequests / limit),
                hasNext: page < Math.ceil(totalRequests / limit),
                hasPrev: page > 1
            },
            filters: {
                method: method || 'all',
                statusCode: statusCode || 'all',
                timeRange: timeRange || '24h',
                sortBy: mappedSortBy,
                order
            }
        });
        return;

    } catch (error) {
        console.error("Error fetching project requests:", error);
        res.status(500).json({ error: 'Failed to fetch project requests.' });
        return;
    }
};
