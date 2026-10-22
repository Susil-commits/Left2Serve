import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { validateIdParam } from '../middleware/validateParam.js';
import { validate } from '../middleware/validate.js';
import { cacheMiddleware } from '../utils/cache.js';
import { ForumController } from '../controllers/ForumController.js';

const router = Router();

const postSchema = z.object({
  title: z.string().min(2, 'Title is too short').max(200, 'Title is too long'),
  content: z.string().min(2, 'Content is too short').max(5000, 'Content is too long'),
});

const replySchema = z.object({
  content: z.string().min(2, 'Content is too short').max(3000, 'Content is too long'),
});

router.get('/categories', authMiddleware, cacheMiddleware(300), ForumController.getCategories);
router.get('/categories/:id/posts', authMiddleware, cacheMiddleware(60), validateIdParam('id'), ForumController.getPostsInCategory);
router.post('/categories/:id/posts', authMiddleware, validateIdParam('id'), validate(postSchema), ForumController.createPost);
router.get('/posts/:id', authMiddleware, validateIdParam('id'), ForumController.getPostDetails);
router.post('/posts/:id/replies', authMiddleware, validateIdParam('id'), validate(replySchema), ForumController.createReply);
router.put('/replies/:id', authMiddleware, validateIdParam('id'), validate(replySchema), ForumController.updateReply);
router.delete('/replies/:id', authMiddleware, validateIdParam('id'), ForumController.deleteReply);
router.put('/posts/:id', authMiddleware, validateIdParam('id'), validate(postSchema), ForumController.updatePost);
router.delete('/posts/:id', authMiddleware, validateIdParam('id'), ForumController.deletePost);

export default router;
