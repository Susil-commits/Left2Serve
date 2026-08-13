import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
export const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const isOperational = err instanceof AppError ? err.isOperational : false;
    const reqId = req.reqId;
    if (statusCode >= 500) {
        logger.error(err.message || 'Internal Server Error', { stack: err.stack, reqId });
    }
    else {
        logger.warn(err.message, { stack: err.stack, reqId });
    }
    // Express parsing error overrides
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
    // Database error translation
    if (err?.code) {
        switch (err.code) {
            case '23505': // unique_violation
                return res.status(409).json({ error: 'A record with this value already exists.' });
            case '23503': // foreign_key_violation
                return res.status(400).json({ error: 'Referenced record does not exist.' });
            case '22P02': // invalid_text_representation
                return res.status(400).json({ error: 'Invalid input format.' });
            case '23502': // not_null_violation
                return res.status(400).json({ error: 'Missing required field.' });
        }
    }
    const isProduction = process.env.NODE_ENV === 'production';
    return res.status(statusCode).json({
        error: isProduction ? 'Internal Server Error' : err.message,
        ...(isProduction ? {} : { stack: err.stack }),
    });
};
