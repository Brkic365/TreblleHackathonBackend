// src/api/routes/auth.ts
import { Router } from 'express';
import { handleSession, createOAuthUser, register, login } from '../../controllers/auth.controller.js';

const router = Router();

// Public auth routes (no authentication required)
router.post('/register', register);
router.post('/login', login);

// Internal API routes (require internal API key)
router.post('/session', handleSession);
router.post('/oauth-user', createOAuthUser);

export default router;