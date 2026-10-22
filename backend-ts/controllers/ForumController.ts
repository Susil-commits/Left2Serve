import { Request, Response, NextFunction } from 'express';
import { ForumService } from '../services/ForumService.js';

export class ForumController {
  static async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await ForumService.getCategories(req.user!.role);
      res.json(categories);
    } catch (err) { next(err); }
  }

  static async getPostsInCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ForumService.getPostsInCategory(Number(req.params.id), req.user!.role);
      res.json(data);
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
      } else {
        next(err);
      }
    }
  }

  static async createPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const post = await ForumService.createPost(Number(req.params.id), req.user!.id, req.user!.role, req.body);
      res.status(201).json(post);
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
      } else {
        next(err);
      }
    }
  }

  static async getPostDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ForumService.getPostDetails(Number(req.params.id), req.user!.role);
      res.json(data);
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
      } else {
        next(err);
      }
    }
  }

  static async createReply(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reply = await ForumService.createReply(Number(req.params.id), req.user!.id, req.user!.role, req.body.content);
      res.status(201).json(reply);
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
      } else {
        next(err);
      }
    }
  }

  static async updateReply(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reply = await ForumService.updateReply(Number(req.params.id), req.user!.id, req.user!.role, req.body.content);
      res.json(reply);
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
      } else {
        next(err);
      }
    }
  }

  static async deleteReply(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await ForumService.deleteReply(Number(req.params.id), req.user!.id, req.user!.role);
      res.json({ message: 'Reply deleted' });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
      } else {
        next(err);
      }
    }
  }

  static async updatePost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const post = await ForumService.updatePost(Number(req.params.id), req.user!.id, req.user!.role, req.body);
      res.json(post);
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
      } else {
        next(err);
      }
    }
  }

  static async deletePost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await ForumService.deletePost(Number(req.params.id), req.user!.id, req.user!.role);
      res.json({ message: 'Post deleted' });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
      } else {
        next(err);
      }
    }
  }
}
