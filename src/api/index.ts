// src/api/index.ts
import { Router } from 'express';
// We will create these routers in the next steps
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import requestsRoutes from './routes/requests.js';
import analyticsRoutes from './routes/analytics.js';
import userRoutes from './routes/user.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/requests', requestsRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/user', userRoutes);

export default router;