import { Express, Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Register error handlers - must be called after all other middleware/routes
 */
export function registerErrorHandler(app: Express): void {
  // 404 handler for undefined routes
  app.use((_req: Request, res: Response): void => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
      path: _req.path,
      method: _req.method,
    });
  });

  // Global error handler (must be last middleware)
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
    const appError = err as AppError;

    // Log error details
    logger.error('Unhandled error', {
      message: err.message,
      stack: err.stack,
      path: _req.path,
      method: _req.method,
      statusCode: appError.statusCode || 500,
    });

    // Custom application error with specific status code
    if (appError.statusCode && appError.code) {
      res.status(appError.statusCode).json({
        success: false,
        error: appError.message,
        code: appError.code,
      });
      return;
    }

    // Default 500 error
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
      code: 'INTERNAL_SERVER_ERROR',
    });
  });
}