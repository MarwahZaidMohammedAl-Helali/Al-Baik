import { Response } from 'express';
import { ApiResponse } from '../types/common';

/**
 * Utility class for standardized API responses
 */
export class ApiResponseUtil {
  /**
   * Send a successful response
   */
  static success<T>(
    res: Response,
    data?: T,
    message?: string,
    statusCode: number = 200,
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      ...(data !== undefined && { data }),
      ...(message && { message }),
      ...(pagination && { pagination })
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send a created response (201)
   */
  static created<T>(res: Response, data?: T, message?: string): void {
    this.success(res, data, message || 'Resource created successfully', 201);
  }

  /**
   * Send a no content response (204)
   */
  static noContent(res: Response): void {
    res.status(204).send();
  }

  /**
   * Send an error response
   */
  static error(
    res: Response,
    code: string,
    message: string,
    statusCode: number = 500,
    details?: any
  ): void {
    const response: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
        timestamp: new Date().toISOString(),
        requestId: res.get('X-Request-ID')
      }
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send a bad request response (400)
   */
  static badRequest(res: Response, message: string = 'Bad request', details?: any): void {
    this.error(res, 'BAD_REQUEST', message, 400, details);
  }

  /**
   * Send an unauthorized response (401)
   */
  static unauthorized(res: Response, message: string = 'Unauthorized'): void {
    this.error(res, 'UNAUTHORIZED', message, 401);
  }

  /**
   * Send a forbidden response (403)
   */
  static forbidden(res: Response, message: string = 'Forbidden'): void {
    this.error(res, 'FORBIDDEN', message, 403);
  }

  /**
   * Send a not found response (404)
   */
  static notFound(res: Response, resource: string = 'Resource'): void {
    this.error(res, 'NOT_FOUND', `${resource} not found`, 404);
  }

  /**
   * Send a conflict response (409)
   */
  static conflict(res: Response, message: string = 'Resource already exists'): void {
    this.error(res, 'CONFLICT', message, 409);
  }

  /**
   * Send an internal server error response (500)
   */
  static internalError(res: Response, message: string = 'Internal server error'): void {
    this.error(res, 'INTERNAL_SERVER_ERROR', message, 500);
  }

  /**
   * Send a paginated response
   */
  static paginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number,
    message?: string
  ): void {
    const totalPages = Math.ceil(total / limit);
    
    this.success(res, data, message, 200, {
      page,
      limit,
      total,
      totalPages
    });
  }
}

/**
 * Express middleware to add response utilities to the response object
 */
export const addResponseUtils = (req: any, res: any, next: any): void => {
  res.success = (data?: any, message?: string, statusCode?: number) => 
    ApiResponseUtil.success(res, data, message, statusCode);
  
  res.created = (data?: any, message?: string) => 
    ApiResponseUtil.created(res, data, message);
  
  res.noContent = () => 
    ApiResponseUtil.noContent(res);
  
  res.badRequest = (message?: string, details?: any) => 
    ApiResponseUtil.badRequest(res, message, details);
  
  res.unauthorized = (message?: string) => 
    ApiResponseUtil.unauthorized(res, message);
  
  res.forbidden = (message?: string) => 
    ApiResponseUtil.forbidden(res, message);
  
  res.notFound = (resource?: string) => 
    ApiResponseUtil.notFound(res, resource);
  
  res.conflict = (message?: string) => 
    ApiResponseUtil.conflict(res, message);
  
  res.internalError = (message?: string) => 
    ApiResponseUtil.internalError(res, message);
  
  res.paginated = (data: any[], page: number, limit: number, total: number, message?: string) => 
    ApiResponseUtil.paginated(res, data, page, limit, total, message);

  next();
};