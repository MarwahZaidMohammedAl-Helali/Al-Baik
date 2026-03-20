import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/common';
import { logger } from '../utils/logger';

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = req.headers['x-request-id'] as string || 
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Log the 404 for monitoring
  logger.warn('Endpoint not found:', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  const response: ApiResponse = {
    success: false,
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: `The requested endpoint ${req.method} ${req.path} was not found`,
      timestamp: new Date().toISOString(),
      requestId
    }
  };

  res.status(404).json(response);
};