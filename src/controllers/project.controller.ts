// src/controllers/project.controller.ts

import type { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { v4 as uuidv4 } from 'uuid'; // We need a library to generate unique IDs for the proxy URL

// --- CREATE a new Project ---
export const createProject = async (req: Request, res: Response) => {
    const { name, originalBaseUrl } = req.body;
    const userId = req.user?.userId;

    if (!name || !originalBaseUrl) {
        return res.status(400).json({ error: 'Name and originalBaseUrl are required.' });
    }
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }

    // Generate a unique part for the proxy URL
    const proxyIdentifier = uuidv4(); 
    const proxyUrl = `${process.env['PROXY_BASE_URL']}/proxy/${proxyIdentifier}`;

    try {
        const newProject = await prisma.project.create({
            data: {
                name,
                originalBaseUrl,
                userId,
                proxyUrl: proxyIdentifier, // Store only the unique identifier in the DB
            },
        });
        
        // Return the full proxy URL to the frontend, but only store the ID
        res.status(201).json({ ...newProject, proxyUrl });
        return;

    } catch (error) {
        console.error("Error creating project:", error);
        res.status(500).json({ error: 'Failed to create project.' });
        return;
    }
};

// --- GET all Projects for the logged-in user ---
export const getProjects = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }

    try {
        const projects = await prisma.project.findMany({
            where: { userId },
            // Optional: Include a count of endpoints for each project
            include: {
                _count: {
                    select: { endpoints: true },
                }
            }
        });

        // Add the full proxy URL to each project before sending to the frontend
        const projectsWithFullProxyUrl = projects.map((p: any) => ({
            ...p,
            proxyUrl: `${process.env['PROXY_BASE_URL']}/proxy/${p.proxyUrl}`
        }));

        res.json(projectsWithFullProxyUrl);
        return;

    } catch (error) {
        console.error("Error fetching projects:", error);
        res.status(500).json({ error: 'Failed to fetch projects.' });
        return;
    }
};

// --- GET a single Project by its ID ---
export const getProjectById = async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const userId = req.user?.userId;

    try {
        if (!projectId || !userId) {
            return res.status(400).json({ error: 'Project ID and user ID are required.' });
        }

        const project = await prisma.project.findFirst({
            where: { id: projectId, userId: userId }, // Security: Ensure user owns this project
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found.' });
        }
        
        const projectWithFullProxyUrl = {
            ...project,
            proxyUrl: `${process.env['PROXY_BASE_URL']}/proxy/${project.proxyUrl}`
        };

        res.json(projectWithFullProxyUrl);
        return;

    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch project.' });
        return;
    }
};

// --- (Optional but good) UPDATE a Project ---
export const updateProject = async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const { name, originalBaseUrl } = req.body;
    const userId = req.user?.userId;

    try {
        if (!projectId || !userId) {
            return res.status(400).json({ error: 'Project ID and user ID are required.' });
        }

        const updatedProject = await prisma.project.updateMany({
            where: { id: projectId, userId: userId }, // Security check
            data: { name, originalBaseUrl },
        });

        if (updatedProject.count === 0) {
            return res.status(404).json({ error: 'Project not found or you do not have permission to edit it.' });
        }

        // Fetch the updated project to return it
        const project = await prisma.project.findFirst({
            where: { id: projectId, userId: userId },
        });

        res.json(project);
        return;
    } catch (error) {
        res.status(404).json({ error: 'Project not found or you do not have permission to edit it.' });
        return;
    }
};

// --- (Optional but good) DELETE a Project ---
export const deleteProject = async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const userId = req.user?.userId;

    try {
        // Important: Use a transaction to delete related data first, then the project
        await prisma.$transaction(async (tx: any) => {
            // Delete all endpoints and their related data
            const endpoints = await tx.apiEndpoint.findMany({
                where: { projectId: projectId },
                select: { id: true }
            });
            
            for (const endpoint of endpoints) {
                await tx.apiRequestLog.deleteMany({
                    where: { apiEndpointId: endpoint.id },
                });
                await tx.securityIssue.deleteMany({
                    where: { apiEndpointId: endpoint.id },
                });
                await tx.analyticsAggregation.deleteMany({
                    where: { apiEndpointId: endpoint.id },
                });
            }
            
            await tx.apiEndpoint.deleteMany({
                where: { projectId: projectId },
            });
            
            await tx.project.delete({
                where: { id: projectId, userId: userId }, // Security check
            });
        });
        res.status(204).send(); // No content
        return;
    } catch (error) {
        res.status(404).json({ error: 'Project not found or you do not have permission to delete it.' });
        return;
    }
};