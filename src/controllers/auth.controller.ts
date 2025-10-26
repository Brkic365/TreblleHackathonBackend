// src/controllers/auth.controller.ts
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';

export const register = async (req: Request, res: Response) => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required.' });
    }

    try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(409).json({ error: 'User with this email already exists.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                provider: 'credentials'
            } as any
        });

        // Generate JWT token
        const token = jwt.sign(
            { userId: newUser.id, email: newUser.email },
            process.env['JWT_SECRET'] as string,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            token,
            user: {
                id: newUser.id,
                email: newUser.email,
                name: (newUser as any).name,
                provider: (newUser as any).provider,
                createdAt: newUser.createdAt
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to create account.' });
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        // Find user with password
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                password: true,
                name: true,
                provider: true,
                createdAt: true
            }
        });

        if (!user || !user.password) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env['JWT_SECRET'] as string,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: (user as any).name,
                provider: (user as any).provider,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login.' });
    }
};

export const handleSession = async (req: Request, res: Response) => {
    const apiKey = req.headers['x-internal-api-key'];
    if (apiKey !== process.env['INTERNAL_API_KEY']) {
        return res.status(401).json({ error: `crazyy api key: ${process.env['INTERNAL_API_KEY']}` });
    }

    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
    }

    try {
        // Check if user exists first
        const existingUser = await prisma.user.findUnique({
            where: { email: email }
        });

        if (existingUser) {
            // User exists, return existing token
            const token = jwt.sign(
                { userId: existingUser.id, email: existingUser.email },
                process.env['JWT_SECRET'] as string,
                { expiresIn: '7d' }
            );
            
            return res.json({
                token,
                user: {
                    id: existingUser.id,
                    email: existingUser.email,
                    name: (existingUser as any).name,
                    provider: (existingUser as any).provider,
                    providerId: (existingUser as any).providerId,
                    createdAt: existingUser.createdAt
                }
            });
        }

        // User doesn't exist, return 404 so frontend can create them via OAuth
        return res.status(404).json({ error: 'User not found' });

    } catch (error) {
        console.error("Session handling error:", error);
        res.status(500).json({ error: `crazyy api key: ${process.env['INTERNAL_API_KEY']}, ${apiKey}` });
        return;
    }
};

export const createOAuthUser = async (req: Request, res: Response) => {
    const apiKey = req.headers['x-internal-api-key'];
    if (apiKey !== process.env['INTERNAL_API_KEY']) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { email, name, provider, providerId } = req.body;

    if (!email || !provider || !providerId) {
        return res.status(400).json({ error: 'Email, provider, and providerId are required.' });
    }

    try {
        // Check if user already exists (shouldn't happen due to frontend logic, but safety check)
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            // User exists, return existing token
            const token = jwt.sign(
                { userId: existingUser.id, email: existingUser.email },
                process.env['JWT_SECRET'] as string,
                { expiresIn: '7d' }
            );
            
            return res.json({
                token,
                user: {
                    id: existingUser.id,
                    email: existingUser.email,
                    name: (existingUser as any).name,
                    provider: (existingUser as any).provider,
                    providerId: (existingUser as any).providerId,
                    createdAt: existingUser.createdAt
                }
            });
        }

        // Create new user
        const newUser = await prisma.user.create({
            data: {
                email,
                name,
                provider,
                providerId,
            } as any
        });

        // Generate JWT token
        const token = jwt.sign(
            { userId: newUser.id, email: newUser.email },
            process.env['JWT_SECRET'] as string,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: newUser.id,
                email: newUser.email,
                name: (newUser as any).name,
                provider: (newUser as any).provider,
                providerId: (newUser as any).providerId,
                createdAt: newUser.createdAt
            }
        });

    } catch (error) {
        console.error('OAuth user creation error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
};