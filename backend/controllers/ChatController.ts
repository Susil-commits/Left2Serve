import { Request, Response, NextFunction } from 'express';
import { ChatService } from '../services/ChatService.js';

export class ChatController {
  static async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const messages = await ChatService.getMessages(req.params.reservationId as string, req.user!.id, req.user!.role);
      res.json(messages);
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
      } else {
        next(err);
      }
    }
  }
}
