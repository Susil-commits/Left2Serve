import { Router } from 'express';
import { get, all, insert } from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';
const router = Router();
// GET all categories accessible to user
router.get('/categories', authMiddleware, async (req, res) => {
    try {
        const role = req.user.role;
        const categories = await all('SELECT * FROM forum_categories ORDER BY id ASC');
        // Filter categories by read_roles JSON
        const accessible = categories.filter(c => {
            try {
                const roles = typeof c.read_roles === 'string' ? JSON.parse(c.read_roles) : c.read_roles;
                return roles.includes(role);
            }
            catch {
                return false;
            }
        });
        res.json(accessible);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});
// GET posts in a category
router.get('/categories/:id/posts', authMiddleware, async (req, res) => {
    try {
        const category = await get('SELECT * FROM forum_categories WHERE id = ?', [req.params.id]);
        if (!category)
            return res.status(404).json({ error: 'Category not found' });
        let readRoles = [];
        try {
            readRoles = typeof category.read_roles === 'string' ? JSON.parse(category.read_roles) : category.read_roles;
        }
        catch { }
        if (!readRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'You do not have permission to view this category' });
        }
        const posts = await all(`
      SELECT p.*, u.name as author_name, u.role as author_role,
        (SELECT COUNT(*) FROM forum_replies r WHERE r.post_id = p.id) as reply_count
      FROM forum_posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.category_id = ?
      ORDER BY p.created_at DESC
    `, [category.id]);
        res.json({ category, posts });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});
// POST new post in a category
router.post('/categories/:id/posts', authMiddleware, async (req, res) => {
    const { title, content } = req.body;
    if (!title || !content)
        return res.status(400).json({ error: 'Title and content are required' });
    try {
        const category = await get('SELECT * FROM forum_categories WHERE id = ?', [req.params.id]);
        if (!category)
            return res.status(404).json({ error: 'Category not found' });
        let writeRoles = [];
        try {
            writeRoles = typeof category.write_roles === 'string' ? JSON.parse(category.write_roles) : category.write_roles;
        }
        catch { }
        if (!writeRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'You do not have permission to post in this category' });
        }
        const id = await insert('INSERT INTO forum_posts (category_id, user_id, title, content) VALUES (?, ?, ?, ?)', [category.id, req.user.id, title, content]);
        const post = await get('SELECT * FROM forum_posts WHERE id = ?', [id]);
        res.status(201).json(post);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create post' });
    }
});
// GET single post and its replies
router.get('/posts/:id', authMiddleware, async (req, res) => {
    try {
        const post = await get(`
      SELECT p.*, u.name as author_name, u.role as author_role, c.read_roles
      FROM forum_posts p
      JOIN users u ON p.user_id = u.id
      JOIN forum_categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [req.params.id]);
        if (!post)
            return res.status(404).json({ error: 'Post not found' });
        let readRoles = [];
        try {
            readRoles = typeof post.read_roles === 'string' ? JSON.parse(post.read_roles) : post.read_roles;
        }
        catch { }
        if (!readRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'You do not have permission to view this post' });
        }
        delete post.read_roles;
        const replies = await all(`
      SELECT r.*, u.name as author_name, u.role as author_role
      FROM forum_replies r
      JOIN users u ON r.user_id = u.id
      WHERE r.post_id = ?
      ORDER BY r.created_at ASC
    `, [post.id]);
        res.json({ post, replies });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch post details' });
    }
});
// POST reply to a post
router.post('/posts/:id/replies', authMiddleware, async (req, res) => {
    const { content } = req.body;
    if (!content)
        return res.status(400).json({ error: 'Content is required' });
    try {
        const post = await get(`
      SELECT p.id, p.category_id, c.write_roles 
      FROM forum_posts p
      JOIN forum_categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [req.params.id]);
        if (!post)
            return res.status(404).json({ error: 'Post not found' });
        let writeRoles = [];
        try {
            writeRoles = typeof post.write_roles === 'string' ? JSON.parse(post.write_roles) : post.write_roles;
        }
        catch { }
        if (!writeRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'You do not have permission to reply in this category' });
        }
        const replyId = await insert('INSERT INTO forum_replies (post_id, user_id, content) VALUES (?, ?, ?)', [post.id, req.user.id, content]);
        const reply = await get(`
      SELECT r.*, u.name as author_name, u.role as author_role
      FROM forum_replies r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `, [replyId]);
        res.status(201).json(reply);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to post reply' });
    }
});
export default router;
