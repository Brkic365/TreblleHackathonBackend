// src/controllers/proxy.controller.ts

import type { Request, Response } from 'express';
import axios from 'axios';
import { prisma } from '../config/prisma.js';
import { processRequestInBackground } from '../services/proxy.service.js';

export const handleProxyRequest = async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { proxyIdentifier } = req.params;
    
    // Extract the full path after the proxy identifier
    // Reconstruct path from available parameters
    const pathSegments = [
        req.params['path1'],
        req.params['path2'],
        req.params['path3'],
        req.params['path4'],
        req.params['path5']
    ].filter(Boolean); // Remove undefined values
    
    const fullPath = pathSegments.join('/');

    try {
        // Find the project using the unique proxy identifier
        if (!proxyIdentifier) {
            return res.status(400).json({ error: 'Proxy identifier is required.' });
        }

        const project = await prisma.project.findUnique({
            where: { proxyUrl: proxyIdentifier },
        });

        if (!project) {
            return res.status(404).json({ error: 'Proxy endpoint not found.' });
        }

        const targetUrl = `${project.originalBaseUrl}/${fullPath}`;

        const response = await axios({
            method: req.method,
            url: targetUrl,
            data: req.body,
            headers: { ...req.headers, host: new URL(targetUrl).host },
            validateStatus: () => true,
        });

        const durationMs = Date.now() - startTime;

        // "Fire-and-forget" the processing. We do NOT await this.
        processRequestInBackground({
            projectId: project.id,
            request: {
                method: req.method,
                path: `/${fullPath}`,
                headers: req.headers,
                body: req.body,
                ip: req.ip as string,
                userAgent: req.get('User-Agent') || '',
                queryParams: req.query,
            },
            response: {
                status: response.status,
                headers: response.headers,
                body: response.data,
            },
            durationMs,
        });

        // Immediately return the response to the user
        res.status(response.status).set(response.headers).send(response.data);
        return;

    } catch (error) {
        // This catches errors in the proxying itself (e.g., network error)
        res.status(502).json({ error: 'Bad Gateway - Could not connect to the origin server.' });
        return;
    }
};