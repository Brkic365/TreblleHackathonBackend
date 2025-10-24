// src/services/proxy.service.ts

import { prisma } from '../config/prisma.js';
import { getGeoData } from './geo.service.js'; // We'll create this helper next
import { analyzeRequestSecurity } from './security.service.js'; // And this one too
import { updateAnalyticsAggregation } from './analytics.service.js';

// This is the data structure we'll pass to our background worker
interface ProcessLogData {
    projectId: string;
    request: {
        method: string;
        path: string;
        headers: Record<string, any>;
        body: any;
        ip: string;
        userAgent?: string;
        queryParams?: Record<string, any>;
    };
    response: {
        status: number;
        headers: Record<string, any>;
        body: any;
    };
    durationMs: number;
}

/**
 * Processes and saves the API log data in the background.
 * This function is designed to be "fire-and-forget" to not block the response proxy.
 * @param logData - The complete request and response data.
 */
export const processRequestInBackground = (logData: ProcessLogData): void => {
    setImmediate(async () => {
        try {
            // 1. Perform slow I/O operations (GeoIP, Analysis)
            const geoData = await getGeoData(logData.request.ip);
            const analysis = analyzeRequestSecurity(logData.request, logData.response);
            
            // Calculate request/response sizes in bytes
            const requestBodyStr = logData.request.body ? JSON.stringify(logData.request.body) : '';
            const responseBodyStr = logData.response.body ? JSON.stringify(logData.response.body) : '';
            const requestSize = Buffer.byteLength(requestBodyStr, 'utf8');
            const responseSize = Buffer.byteLength(responseBodyStr, 'utf8');

            // 2. Perform the slow database write
            await prisma.apiRequestLog.create({
                data: {
                    projectId: logData.projectId,
                    method: logData.request.method,
                    path: logData.request.path,
                    responseCode: logData.response.status,
                    durationMs: logData.durationMs,
                    requestSize,
                    responseSize,
                    ipAddress: logData.request.ip,
                    userAgent: logData.request.userAgent || null,
                    requestHeaders: logData.request.headers ? JSON.stringify(logData.request.headers) : null,
                    requestBody: requestBodyStr || null,
                    queryParams: logData.request.queryParams ? JSON.stringify(logData.request.queryParams) : null,
                    responseHeaders: logData.response.headers ? JSON.stringify(logData.response.headers) : null,
                    responseBody: responseBodyStr || null,
                    securityScore: analysis.score,
                    securityIssues: JSON.stringify(analysis.issues),
                    ...(geoData && { ...geoData }),
                } as any
            });

            // 3. Update analytics aggregations
            updateAnalyticsAggregation({
                projectId: logData.projectId,
                durationMs: logData.durationMs,
                requestSize,
                responseSize,
                responseCode: logData.response.status,
                securityScore: analysis.score,
                securityIssues: analysis.issues,
                ipAddress: logData.request.ip,
                country: geoData?.country,
            });

        } catch (error) {
            console.error('[Background Worker] Failed to process request log:', error);
        }
    });
};