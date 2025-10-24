// src/controllers/user.controller.ts

import type { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import bcrypt from 'bcryptjs';

// --- UPDATE USER PROFILE ---
export const updateUserProfile = async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { name } = req.body;

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }

    if (!name) {
        return res.status(400).json({ error: 'Name is required.' });
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { name }
        });

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ error: 'Failed to update profile.' });
    }
};

// --- CHANGE PASSWORD ---
export const changePassword = async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    try {
        // Get user with password
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { password: true }
        });

        if (!user || !user.password) {
            return res.status(404).json({ error: 'User not found or password not set.' });
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedNewPassword }
        });

        res.json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: 'Failed to change password.' });
    }
};

// --- EXPORT USER DATA ---
export const exportUserData = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }

    try {
        // Get user data
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Get user's projects
        const projects = await prisma.project.findMany({
            where: { userId },
            select: {
                id: true,
                name: true,
                originalBaseUrl: true,
                createdAt: true
            }
        });

        // Get user's request logs
        const requestLogs = await prisma.apiRequestLog.findMany({
            where: { 
                project: { userId }
            },
            select: {
                id: true,
                method: true,
                path: true,
                responseCode: true,
                durationMs: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 1000 // Limit to last 1000 requests
        });

        // Calculate analytics
        const totalRequests = requestLogs.length;
        const avgResponseTime = totalRequests > 0 
            ? Math.round(requestLogs.reduce((sum, log) => sum + (log.durationMs || 0), 0) / totalRequests)
            : 0;
        const errorCount = requestLogs.filter(log => log.responseCode && log.responseCode >= 400).length;
        const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt
            },
            projects: projects.map(project => ({
                id: project.id,
                name: project.name,
                apiRoute: project.originalBaseUrl,
                createdAt: project.createdAt
            })),
            requests: requestLogs.map(log => ({
                id: log.id,
                method: log.method,
                path: log.path,
                statusCode: log.responseCode,
                responseTime: log.durationMs,
                timestamp: log.createdAt
            })),
            analytics: {
                totalRequests,
                avgResponseTime,
                errorRate: Math.round(errorRate * 100) / 100
            }
        });

    } catch (error) {
        console.error('Error exporting user data:', error);
        res.status(500).json({ error: 'Failed to export user data.' });
    }
};

// --- DELETE ACCOUNT ---
export const deleteAccount = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }

    try {
        // Use transaction to delete all user data
        await prisma.$transaction(async (tx) => {
            // Delete analytics aggregations
            await tx.analyticsAggregation.deleteMany({
                where: { project: { userId } }
            });

            // Delete security issues
            await tx.securityIssue.deleteMany({
                where: { apiEndpoint: { project: { userId } } }
            });

            // Delete request logs
            await tx.apiRequestLog.deleteMany({
                where: { project: { userId } }
            });

            // Delete endpoints
            await tx.apiEndpoint.deleteMany({
                where: { project: { userId } }
            });

            // Delete projects
            await tx.project.deleteMany({
                where: { userId }
            });

            // Finally delete the user
            await tx.user.delete({
                where: { id: userId }
            });
        });

        res.json({
            success: true,
            message: 'Account deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ error: 'Failed to delete account.' });
    }
};
