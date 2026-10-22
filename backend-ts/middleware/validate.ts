import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  try {
    schema.parse(req.body);
    next();
  } catch (err) {
    if ((err as any).errors) {
      const errorMessages = (err as any).errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ error: errorMessages });
    } else {
      res.status(400).json({ error: 'Invalid request body' });
    }
  }
};
