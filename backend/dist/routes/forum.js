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
// GET all categories accessible to user
router.get('/categories', authMiddleware, cacheMiddleware(300), ForumController.getCategories);
// GET posts in a category
router.get('/categories/:id/posts', authMiddleware, cacheMiddleware(60), validateIdParam('id'), ForumController.getPostsInCategory);
// POST new post in a category
router.post('/categories/:id/posts', authMiddleware, validateIdParam('id'), validate(postSchema), ForumController.createPost);
// GET single post and its replies
router.get('/posts/:id', authMiddleware, validateIdParam('id'), ForumController.getPostDetails);
// POST reply to a post
router.post('/posts/:id/replies', authMiddleware, validateIdParam('id'), validate(replySchema), ForumController.createReply);
// PUT edit reply
router.put('/replies/:id', authMiddleware, validateIdParam('id'), validate(replySchema), ForumController.updateReply);
// DELETE reply
router.delete('/replies/:id', authMiddleware, validateIdParam('id'), ForumController.deleteReply);
// PUT edit post
router.put('/posts/:id', authMiddleware, validateIdParam('id'), validate(postSchema), ForumController.updatePost);
// DELETE post
router.delete('/posts/:id', authMiddleware, validateIdParam('id'), ForumController.deletePost);
export default router;
