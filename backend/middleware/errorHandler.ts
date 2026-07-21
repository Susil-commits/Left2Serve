import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const isOperational = err instanceof AppError ? err.isOperational : false;
  const reqId = (req as any).reqId;

  // Log the error
  if (statusCode >= 500) {
    logger.error(err.message || 'Internal Server Error', { stack: err.stack, reqId });
  } else {
    logger.warn(err.message, { stack: err.stack, reqId });
  }

  // Formatting for Express-specific body parsing errors
  if (err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large') {
    return res.status(400).json({ error: 'Invalid or too large request body' });
  }
  if (err?.message?.startsWith('CORS blocked')) {
    return res.status(403).json({ error: 'Not allowed by CORS' });
  }

  // Operational errors
  if (isOperational) {
    return res.status(statusCode).json({
      error: err.message,
    });
  }

  // Unhandled / Programming Errors
  const isProduction = process.env.NODE_ENV === 'production';
  return res.status(statusCode).json({
    error: isProduction ? 'Internal Server Error' : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};
