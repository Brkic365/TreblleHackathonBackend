// src/api/routes/proxy.ts

import { Router } from 'express';
import { handleProxyRequest } from '../../controllers/proxy.controller.js';

const router = Router();

// Handle proxy requests with different path depths
router.all('/:proxyIdentifier', handleProxyRequest);
router.all('/:proxyIdentifier/:path1', handleProxyRequest);
router.all('/:proxyIdentifier/:path1/:path2', handleProxyRequest);
router.all('/:proxyIdentifier/:path1/:path2/:path3', handleProxyRequest);
router.all('/:proxyIdentifier/:path1/:path2/:path3/:path4', handleProxyRequest);
router.all('/:proxyIdentifier/:path1/:path2/:path3/:path4/:path5', handleProxyRequest);

export default router;