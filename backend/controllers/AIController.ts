import { Request, Response, NextFunction } from 'express';
import { AIService } from '../services/AIService.js';

export class AIController {
  static async describe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const description = await AIService.generateDescription(req.body.title, req.body.category);
      res.json(description);
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
      } else {
        next(err);
      }
    }
  }
}
