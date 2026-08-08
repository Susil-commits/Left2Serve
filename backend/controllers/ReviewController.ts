import { Request, Response, NextFunction } from 'express';
import { ReviewService } from '../services/ReviewService.js';

export class ReviewController {
  static async createReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const review = await ReviewService.createReview(req.user!.id, req.body);
      res.status(201).json(review);
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
      } else {
        next(err);
      }
    }
  }

  static async getReservationReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const info = await ReviewService.getReservationReviewInfo(Number(req.params.id), req.user!.id);
      res.json(info);
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
      } else {
        next(err);
      }
    }
  }

  static async getUserReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const info = await ReviewService.getUserReviews(Number(req.params.userId));
      res.json(info);
    } catch (err) { next(err); }
  }
}
