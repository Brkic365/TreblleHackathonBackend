// src/controllers/overview.controller.ts

import type { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert time range string to milliseconds
 */
const getTimeRangeMs = (timeRange: string): number => {
  const timeRanges = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  return timeRanges[timeRange as keyof typeof timeRanges] || timeRanges['24h'];
};

/**
 * Get time interval for data grouping based on time range
 */
const getTimeInterval = (timeRange: string): number => {
  const intervals = {
    '1h': 5 * 60 * 1000,    // 5 minutes
    '24h': 60 * 60 * 1000,  // 1 hour
    '7d': 24 * 60 * 60 * 1000,  // 1 day
    '30d': 24 * 60 * 60 * 1000, // 1 day
  };
  return intervals[timeRange as keyof typeof intervals] || intervals['24h'];
};

/**
 * Format time string based on time range
 */
const formatTimeString = (date: Date, timeRange: string): string => {
  switch (timeRange) {
    case '1h':
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    case '24h':
      return date.toLocaleTimeString('en-US', { hour: '2-digit' });
    default:
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
};

// ============================================================================
// DATA CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate KPIs for a project within a time range
 */
const calculateKPIs = async (projectId: string, startTime: Date) => {
  const [logs, securityIssueCount] = await Promise.all([
    prisma.apiRequestLog.findMany({
      where: {
        projectId: projectId,
        createdAt: { gte: startTime }
      }
    }),
    prisma.securityIssue.count({
      where: {
        apiEndpointId: projectId,
        createdAt: { gte: startTime }
      }
    })
  ]);

  const totalRequests = logs.length;
  const errorLogs = logs.filter((log: any) => log.responseCode && log.responseCode >= 400);
  const successLogs = logs.filter((log: any) => log.responseCode && log.responseCode < 400);
  
  const errorCount = errorLogs.length;
  const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;
  const uptime = totalRequests > 0 ? (successLogs.length / totalRequests) * 100 : 100;
  
  const avgResponseTime = logs.length > 0 
    ? logs.reduce((sum: number, log: any) => sum + (log.durationMs || 0), 0) / logs.length 
    : 0;

  const securityScores = logs
    .filter((log: any) => log.securityScore)
    .map((log: any) => log.securityScore!);
  
  const securityScore = securityScores.length > 0 
    ? securityScores.reduce((sum: number, score: number) => sum + score, 0) / securityScores.length 
    : 100;

  return {
    avgResponseTime: Math.round(avgResponseTime * 100) / 100,
    errorRate: Math.round(errorRate * 100) / 100,
    securityScore: Math.round(securityScore),
    uptime: Math.round(uptime * 100) / 100,
    totalRequests,
    errorCount,
    securityIssueCount
  };
};

/**
 * Get request volume data grouped by time intervals
 */
const getRequestVolumeData = async (projectId: string, startTime: Date, timeRange: string) => {
  const logs = await prisma.apiRequestLog.findMany({
    where: {
      projectId: projectId,
      createdAt: { gte: startTime }
    },
    orderBy: { createdAt: 'asc' }
  });

  const intervalMs = getTimeInterval(timeRange);
  const groupedData: { [key: string]: number } = {};
  
  logs.forEach(log => {
    const timeKey = new Date(Math.floor(log.createdAt.getTime() / intervalMs) * intervalMs);
    const timeStr = formatTimeString(timeKey, timeRange);
    groupedData[timeStr] = (groupedData[timeStr] || 0) + 1;
  });

  return Object.entries(groupedData)
    .map(([time, value]) => ({ time, value }))
    .sort((a, b) => a.time.localeCompare(b.time));
};

/**
 * Get response time data grouped by time intervals
 */
const getResponseTimeData = async (projectId: string, startTime: Date, timeRange: string) => {
  const logs = await prisma.apiRequestLog.findMany({
    where: {
      projectId: projectId,
      createdAt: { gte: startTime },
      durationMs: { not: null }
    },
    orderBy: { createdAt: 'asc' }
  });

  const intervalMs = getTimeInterval(timeRange);
  const groupedData: { [key: string]: number[] } = {};
  
  logs.forEach(log => {
    const timeKey = new Date(Math.floor(log.createdAt.getTime() / intervalMs) * intervalMs);
    const timeStr = formatTimeString(timeKey, timeRange);
    
    if (!groupedData[timeStr]) groupedData[timeStr] = [];
    groupedData[timeStr].push(log.durationMs!);
  });

  return Object.entries(groupedData)
    .map(([time, durations]) => ({
      time,
      value: Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
    }))
    .sort((a, b) => a.time.localeCompare(b.time));
};

/**
 * Get top errors grouped by response code and path
 */
const getTopErrors = async (projectId: string, startTime: Date) => {
  const errorLogs = await prisma.apiRequestLog.findMany({
    where: {
      projectId: projectId,
      createdAt: { gte: startTime },
      responseCode: { gte: 400 }
    }
  });

  const errorGroups: { [key: string]: any } = {};
  
  errorLogs.forEach((log: any) => {
    const key = `${log.responseCode}-${log.path}`;
    if (!errorGroups[key]) {
      errorGroups[key] = {
        id: `error-${key}`,
        message: `HTTP ${log.responseCode} - ${log.path}`,
        timestamp: log.createdAt.toISOString(),
        severity: (log.responseCode && log.responseCode >= 500) ? 'high' : 'medium',
        occurrences: 0,
        errorType: (log.responseCode && log.responseCode >= 500) ? 'server_error' : 'client_error'
      };
    }
    errorGroups[key].occurrences++;
  });

  return Object.values(errorGroups)
    .sort((a: any, b: any) => b.occurrences - a.occurrences)
    .slice(0, 10);
};

/**
 * Get security issues for a project
 */
const getSecurityIssues = async (projectId: string, startTime: Date) => {
  const securityIssues = await prisma.securityIssue.findMany({
    where: {
      apiEndpointId: projectId,
      createdAt: { gte: startTime }
    },
    orderBy: { createdAt: 'desc' }
  });

  return securityIssues.map((issue: any) => ({
    id: issue.id,
    title: issue.title,
    severity: issue.severity,
    timestamp: issue.createdAt.toISOString(),
    description: issue.description,
    recommendation: issue.recommendation
  }));
};

// ============================================================================
// API ENDPOINT FUNCTIONS
// ============================================================================

/**
 * Validate user access to project
 */
const validateProjectAccess = async (projectId: string, userId: string) => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId }
  });
  
  if (!project) {
    throw new Error('Project not found');
  }
  
  return project;
};

/**
 * Get user ID from request with proper validation
 */
const getUserId = (req: Request): string => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new Error('Unauthorized');
  }
  return userId;
};

/**
 * Get project ID from request params with proper validation
 */
const getProjectId = (req: Request): string => {
  const projectId = req.params['projectId'];
  if (!projectId) {
    throw new Error('Project ID is required');
  }
  return projectId;
};

/**
 * Main project overview endpoint - returns all overview data
 */
export const getProjectOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { timeRange = '24h' } = req.query;
    
    const userId = getUserId(req);
    const projectId = getProjectId(req);
    await validateProjectAccess(projectId, userId);

    const timeRangeMs = getTimeRangeMs(timeRange as string);
    const startTime = new Date(Date.now() - timeRangeMs);

    // Fetch all data in parallel for better performance
    const [kpis, requestVolumeData, responseTimeData, errors, securityIssues] = await Promise.all([
      calculateKPIs(projectId, startTime),
      getRequestVolumeData(projectId, startTime, timeRange as string),
      getResponseTimeData(projectId, startTime, timeRange as string),
      getTopErrors(projectId, startTime),
      getSecurityIssues(projectId, startTime)
    ]);

    res.json({
      kpis,
      requestVolumeData,
      responseTimeData,
      errors,
      securityIssues
    });

  } catch (error) {
    console.error('Error fetching project overview:', error);
    
    if (error instanceof Error && error.message === 'Project not found') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Individual KPI endpoint - returns only KPI metrics
 */
export const getProjectKPIs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { timeRange = '24h' } = req.query;
    
    const userId = getUserId(req);
    const projectId = getProjectId(req);
    await validateProjectAccess(projectId, userId);

    const timeRangeMs = getTimeRangeMs(timeRange as string);
    const startTime = new Date(Date.now() - timeRangeMs);
    const kpis = await calculateKPIs(projectId, startTime);

    res.json(kpis);

  } catch (error) {
    console.error('Error fetching project KPIs:', error);
    
    if (error instanceof Error && error.message === 'Project not found') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Chart data endpoint - returns request volume and response time data
 */
export const getProjectCharts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { timeRange = '24h' } = req.query;
    
    const userId = getUserId(req);
    const projectId = getProjectId(req);
    await validateProjectAccess(projectId, userId);

    const timeRangeMs = getTimeRangeMs(timeRange as string);
    const startTime = new Date(Date.now() - timeRangeMs);

    const [requestVolumeData, responseTimeData] = await Promise.all([
      getRequestVolumeData(projectId, startTime, timeRange as string),
      getResponseTimeData(projectId, startTime, timeRange as string)
    ]);

    res.json({
      requestVolumeData,
      responseTimeData
    });

  } catch (error) {
    console.error('Error fetching project charts:', error);
    
    if (error instanceof Error && error.message === 'Project not found') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Errors endpoint - returns top errors for the project
 */
export const getProjectErrors = async (req: Request, res: Response): Promise<void> => {
  try {
    const { timeRange = '24h' } = req.query;
    
    const userId = getUserId(req);
    const projectId = getProjectId(req);
    await validateProjectAccess(projectId, userId);

    const timeRangeMs = getTimeRangeMs(timeRange as string);
    const startTime = new Date(Date.now() - timeRangeMs);
    const errors = await getTopErrors(projectId, startTime);

    res.json(errors);

  } catch (error) {
    console.error('Error fetching project errors:', error);
    
    if (error instanceof Error && error.message === 'Project not found') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Security issues endpoint - returns security issues for the project
 */
export const getProjectSecurityIssues = async (req: Request, res: Response): Promise<void> => {
  try {
    const { timeRange = '24h' } = req.query;
    
    const userId = getUserId(req);
    const projectId = getProjectId(req);
    await validateProjectAccess(projectId, userId);

    const timeRangeMs = getTimeRangeMs(timeRange as string);
    const startTime = new Date(Date.now() - timeRangeMs);
    const securityIssues = await getSecurityIssues(projectId, startTime);

    res.json(securityIssues);

  } catch (error) {
    console.error('Error fetching project security issues:', error);
    
    if (error instanceof Error && error.message === 'Project not found') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};
