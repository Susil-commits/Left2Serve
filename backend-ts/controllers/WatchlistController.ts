import { Request, Response, NextFunction } from 'express';
import { WatchlistService } from '../services/WatchlistService.js';

export class WatchlistController {
  static async getUserWatchlists(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const lists = await WatchlistService.getUserWatchlists(req.user!.id);
      res.json(lists);
    } catch (err) { next(err); }
  }

  static async createWatchlist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const w = await WatchlistService.createWatchlist(req.user!.id, req.body);
      res.status(201).json(w);
    } catch (err) { next(err); }
  }

  static async deleteWatchlist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await WatchlistService.deleteWatchlist(req.params.id as string, req.user!.id);
      res.json({ message: 'Deleted successfully' });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
      } else {
        next(err);
      }
    }
  }
}
