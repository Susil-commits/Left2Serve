import { Request, Response, NextFunction } from 'express';

export function validateIdParam(paramName: string = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    const val = req.params[paramName];
    if (val === undefined) return next(); // Not present in route

    const num = Number(val);
    if (!Number.isInteger(num) || num <= 0) {
      return res.status(400).json({ error: `Invalid parameter: ${paramName} must be a positive integer` });
    }
    next();
  };
}
