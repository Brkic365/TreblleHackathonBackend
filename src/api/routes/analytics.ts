// src/api/routes/analytics.ts

import { Router } from 'express';
import { getAnalytics } from '../../controllers/analytics.controller.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateToken);
router.get('/', getAnalytics);

export default router;