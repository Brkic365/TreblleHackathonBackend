// src/api/routes/projects.ts

import { Router } from 'express';
import { createProject, getProjects, getProjectById, updateProject, deleteProject } from '../../controllers/project.controller.js';
import { 
  getProjectOverview, 
  getProjectKPIs, 
  getProjectCharts, 
  getProjectErrors, 
  getProjectSecurityIssues 
} from '../../controllers/overview.controller.js';
import { getProjectRequests } from '../../controllers/request.controller.js';
import { getProjectEndpoints } from '../../controllers/endpoint.controller.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';

const router = Router();

// Apply the authentication middleware to ALL routes in this file
router.use(authenticateToken);

router.post('/', createProject);
router.get('/', getProjects);

router.get('/:projectId', getProjectById);
router.put('/:projectId', updateProject);
router.delete('/:projectId', deleteProject);

// Project Overview Routes
router.get('/:projectId/overview', getProjectOverview);
router.get('/:projectId/kpis', getProjectKPIs);
router.get('/:projectId/charts', getProjectCharts);
router.get('/:projectId/errors', getProjectErrors);
router.get('/:projectId/security-issues', getProjectSecurityIssues);

// Project Requests Route
router.get('/:projectId/requests', getProjectRequests);

// Project Endpoints Route
router.get('/:projectId/endpoints', getProjectEndpoints);

export default router;