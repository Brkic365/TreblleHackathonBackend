// src/api/routes/requests.ts

import { Router } from 'express';
import { getProjectRequests } from '../../controllers/request.controller.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';

const router = Router();

// All request log routes are protected
router.use(authenticateToken);

// This route is nested under projects conceptually
// GET /api/projects/:projectId/requests
router.get('/projects/:projectId/requests', getProjectRequests);


export default router;