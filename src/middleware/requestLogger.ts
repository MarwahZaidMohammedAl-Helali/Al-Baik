import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface RequestLogData {
  requestId: string;
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
  timestamp: string;
  duration?: number;
  statusCode?: number;
  responseSize?: number;
  errorCode?: string;
}

/**
 * Enhanced request logging middleware with performance tracking
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] as string;
  
  // Log incoming request
  const requestData = {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as any).user?.id,
    timestamp: new Date().toISOString()
  };

  // Log request details (excluding sensitive data)
  const logData = {
    ...requestData,
    query: req.query,
    // Only log body for non-GET requests, and exclude sensitive fields
    body: req.method !== 'GET' ? sanitizeLogData(req.body) : undefined
  };

  logger.info('Incoming request:', logData);

  // Capture original res.json to log response
  const originalJson = res.json;
  let responseBody: any;

  res.json = function(body: any) {
    responseBody = body;
    return originalJson.call(this, body);
  };

  // Log response when request completes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const responseSize = res.get('content-length') ? parseInt(res.get('content-length')!) : 0;
    
    const responseData = {
      ...requestData,
      duration,
      statusCode: res.statusCode,
      responseSize,
      errorCode: responseBody?.error?.code
    };

    // Determine log level based on status code
    if (res.statusCode >= 500) {
      logger.error('Request completed with server error:', {
        ...responseData,
        response: sanitizeLogData(responseBody)
      });
    } else if (res.statusCode >= 400) {
      logger.warn('Request completed with client error:', {
        ...responseData,
        response: sanitizeLogData(responseBody)
      });
    } else {
      logger.info('Request completed successfully:', responseData);
    }

    // Log slow requests
    if (duration > 5000) { // 5 seconds
      logger.warn('Slow request detected:', {
        ...responseData,
        threshold: '5000ms'
      });
    }
  });

  next();
};

/**
 * Sanitize sensitive data from logs
 */
const sanitizeLogData = (data: any): any => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password',
    'token',
    'authorization',
    'secret',
    'key',
    'creditCard',
    'ssn',
    'socialSecurityNumber',
    'bankAccount',
    'routingNumber'
  ];

  const sanitized = { ...data };

  const sanitizeObject = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    } else if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const lowerKey = key.toLowerCase();
          if (sensitiveFields.some(field => lowerKey.includes(field))) {
            result[key] = '[REDACTED]';
          } else {
            result[key] = sanitizeObject(obj[key]);
          }
        }
      }
      return result;
    }
    return obj;
  };

  return sanitizeObject(sanitized);
};

/**
 * Performance monitoring middleware
 */
export const performanceMonitor = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // Log performance metrics
    const performanceData = {
      requestId: req.headers['x-request-id'],
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };

    // Log performance warnings for slow requests
    if (duration > 1000) { // 1 second
      logger.warn('Performance warning - slow request:', performanceData);
    } else if (duration > 5000) { // 5 seconds
      logger.error('Performance critical - very slow request:', performanceData);
    }

    // Add performance headers
    res.set('X-Response-Time', `${duration.toFixed(2)}ms`);
  });

  next();
};