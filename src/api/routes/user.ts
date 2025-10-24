// src/api/routes/user.ts

import { Router } from 'express';
import { 
    updateUserProfile, 
    changePassword, 
    exportUserData, 
    deleteAccount 
} from '../../controllers/user.controller.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// User profile management routes
router.put('/profile', updateUserProfile);
router.put('/password', changePassword);
router.get('/export', exportUserData);
router.delete('/account', deleteAccount);

export default router;
