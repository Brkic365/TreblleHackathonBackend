// src/services/security.service.ts

// Define a consistent structure for our security issues
export interface SecurityIssue {
  type: 'SENSITIVE_DATA' | 'AUTH' | 'BEST_PRACTICE' | 'SERVER_INFO' | 'INSECURE_TRANSPORT';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  recommendation: string; // Actionable advice for the user
}

// Helper types for clarity
type RequestData = {
    method: string;
    path: string;
    headers: Record<string, any>;
    body: any;
};

type ResponseData = {
    status: number;
    headers: Record<string, any>;
    body: any;
};

// --- Individual Security Checks ---

/**
 * Scans the response body for common sensitive data patterns.
 * @returns An array of security issues found.
 */
const checkSensitiveDataExposure = (response: ResponseData): SecurityIssue[] => {
    const issues: SecurityIssue[] = [];
    const responseBodyString = JSON.stringify(response.body);

    const sensitivePatterns = {
        'password': /"password"\s*:\s*".+"/i,
        'api_key': /"api_key"\s*:\s*".+"/i,
        'secret': /"secret"\s*:\s*".+"/i,
        'token': /"token"\s*:\s*".{20,}"/i, // Look for long token strings
        'credit_card': /\b(?:\d[ -]*?){13,16}\b/ // Basic credit card number pattern
    };

    for (const [key, pattern] of Object.entries(sensitivePatterns)) {
        if (pattern.test(responseBodyString)) {
            issues.push({
                type: 'SENSITIVE_DATA',
                severity: 'CRITICAL',
                description: `A field resembling a "${key}" was found in the API response body.`,
                recommendation: 'Ensure sensitive data like passwords, tokens, or API keys are never returned in API responses. Use data transformation layers (DTOs) to exclude these fields.'
            });
        }
    }
    return issues;
};

/**
 * Checks for missing authentication on potentially sensitive endpoints.
 * @returns An array of security issues found.
 */
const checkMissingAuthentication = (request: RequestData): SecurityIssue[] => {
    const issues: SecurityIssue[] = [];
    const sensitiveMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

    if (sensitiveMethods.includes(request.method.toUpperCase()) && !request.headers['authorization']) {
        issues.push({
            type: 'AUTH',
            severity: 'HIGH',
            description: `A ${request.method} request was made to "${request.path}" without an Authorization header.`,
            recommendation: 'Protect all state-changing endpoints (POST, PUT, DELETE) with a robust authentication and authorization mechanism.'
        });
    }
    return issues;
};

/**
 * Checks for headers that reveal unnecessary information about the server.
 * @returns An array of security issues found.
 */
const checkServerInfoLeakage = (response: ResponseData): SecurityIssue[] => {
    const issues: SecurityIssue[] = [];

    if (response.headers['x-powered-by']) {
        issues.push({
            type: 'SERVER_INFO',
            severity: 'MEDIUM',
            description: `The 'X-Powered-By' header reveals server technology: ${response.headers['x-powered-by']}.`,
            recommendation: 'Disable the "X-Powered-By" header in your web server or framework settings to avoid giving attackers unnecessary information.'
        });
    }
    return issues;
};

/**
 * Checks for missing security best-practice headers.
 * @returns An array of security issues found.
 */
const checkBestPractices = (request: RequestData, response: ResponseData): SecurityIssue[] => {
    const issues: SecurityIssue[] = [];

    // Check for missing cache-control on GET requests
    if (request.method.toUpperCase() === 'GET' && !response.headers['cache-control']) {
        issues.push({
            type: 'BEST_PRACTICE',
            severity: 'LOW',
            description: 'The GET response is missing a Cache-Control header, which can impact performance.',
            recommendation: 'Add a Cache-Control header to GET responses to improve performance and reduce server load.'
        });
    }
    
    // Check for missing Content-Security-Policy header
    if (!response.headers['content-security-policy']) {
        issues.push({
            type: 'BEST_PRACTICE',
            severity: 'MEDIUM',
            description: 'The "Content-Security-Policy" (CSP) header is missing.',
            recommendation: 'Implement a CSP to mitigate Cross-Site Scripting (XSS) and other injection attacks.'
        });
    }

    return issues;
};


// --- The Main Analysis Engine ---

/**
 * Analyzes a request/response pair for a wide range of security vulnerabilities.
 * @param request - The incoming request data.
 * @param response - The outgoing response data.
 * @returns An object containing the calculated security score and a list of found issues.
 */
export function analyzeRequestSecurity(
    request: RequestData,
    response: ResponseData
): { score: number; issues: SecurityIssue[] } {
    // Combine issues from all individual checks
    const allIssues: SecurityIssue[] = [
        ...checkSensitiveDataExposure(response),
        ...checkMissingAuthentication(request),
        ...checkServerInfoLeakage(response),
        ...checkBestPractices(request, response),
    ];

    // Calculate a score based on the severity of found issues
    let score = 100;
    for (const issue of allIssues) {
        switch (issue.severity) {
            case 'CRITICAL':
                score -= 50;
                break;
            case 'HIGH':
                score -= 25;
                break;
            case 'MEDIUM':
                score -= 10;
                break;
            case 'LOW':
                score -= 5;
                break;
        }
    }

    return {
        score: Math.max(0, score), // Ensure score doesn't go below 0
        issues: allIssues,
    };
}