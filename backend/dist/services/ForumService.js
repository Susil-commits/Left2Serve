import { get, all, run, insert } from '../db/database.js';
import { AppError } from '../utils/AppError.js';
export class ForumService {
    static async getCategories(role) {
        const categories = await all('SELECT * FROM forum_categories ORDER BY id ASC');
        return categories.filter((c) => {
            try {
                const roles = typeof c.read_roles === 'string' ? JSON.parse(c.read_roles) : c.read_roles;
                return roles.includes(role);
            }
            catch {
                return false;
            }
        });
    }
    static async getPostsInCategory(categoryId, role) {
        const category = await get('SELECT * FROM forum_categories WHERE id = ?', [categoryId]);
        if (!category)
            throw new AppError(404, 'Category not found');
        let readRoles = [];
        try {
            readRoles = typeof category.read_roles === 'string' ? JSON.parse(category.read_roles) : category.read_roles;
        }
        catch { }
        if (!readRoles.includes(role)) {
            throw new AppError(403, 'You do not have permission to view this category');
        }
        const posts = await all(`
      SELECT p.*, u.name as author_name, u.role as author_role,
        (SELECT COUNT(*) FROM forum_replies r WHERE r.post_id = p.id) as reply_count
      FROM forum_posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.category_id = ?
      ORDER BY p.created_at DESC
    `, [category.id]);
        return { category, posts };
    }
    static async createPost(categoryId, userId, role, data) {
        const { title, content } = data;
        const category = await get('SELECT * FROM forum_categories WHERE id = ?', [categoryId]);
        if (!category)
            throw new AppError(404, 'Category not found');
        let writeRoles = [];
        try {
            writeRoles = typeof category.write_roles === 'string' ? JSON.parse(category.write_roles) : category.write_roles;
        }
        catch { }
        if (!writeRoles.includes(role)) {
            throw new AppError(403, 'You do not have permission to post in this category');
        }
        const id = await insert('INSERT INTO forum_posts (category_id, user_id, title, content) VALUES (?, ?, ?, ?)', [category.id, userId, title, content]);
        return await get('SELECT * FROM forum_posts WHERE id = ?', [id]);
    }
    static async getPostDetails(postId, role) {
        const post = await get(`
      SELECT p.*, u.name as author_name, u.role as author_role, c.read_roles
      FROM forum_posts p
      JOIN users u ON p.user_id = u.id
      JOIN forum_categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [postId]);
        if (!post)
            throw new AppError(404, 'Post not found');
        let readRoles = [];
        try {
            readRoles = typeof post.read_roles === 'string' ? JSON.parse(post.read_roles) : post.read_roles;
        }
        catch { }
        if (!readRoles.includes(role)) {
            throw new AppError(403, 'You do not have permission to view this post');
        }
        delete post.read_roles;
        const replies = await all(`
      SELECT r.*, u.name as author_name, u.role as author_role
      FROM forum_replies r
      JOIN users u ON r.user_id = u.id
      WHERE r.post_id = ?
      ORDER BY r.created_at ASC
    `, [post.id]);
        return { post, replies };
    }
    static async createReply(postId, userId, role, content) {
        const post = await get(`
      SELECT p.id, p.category_id, c.write_roles 
      FROM forum_posts p
      JOIN forum_categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [postId]);
        if (!post)
            throw new AppError(404, 'Post not found');
        let writeRoles = [];
        try {
            writeRoles = typeof post.write_roles === 'string' ? JSON.parse(post.write_roles) : post.write_roles;
        }
        catch { }
        if (!writeRoles.includes(role)) {
            throw new AppError(403, 'You do not have permission to reply in this category');
        }
        const replyId = await insert('INSERT INTO forum_replies (post_id, user_id, content) VALUES (?, ?, ?)', [post.id, userId, content]);
        return await get(`
      SELECT r.*, u.name as author_name, u.role as author_role
      FROM forum_replies r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `, [replyId]);
    }
    static async updateReply(replyId, userId, role, content) {
        const reply = await get('SELECT * FROM forum_replies WHERE id = ?', [replyId]);
        if (!reply)
            throw new AppError(404, 'Reply not found');
        if (reply.user_id !== userId && role !== 'admin') {
            throw new AppError(403, 'Not authorized to edit this reply');
        }
        await run('UPDATE forum_replies SET content = ? WHERE id = ?', [content, replyId]);
        return await get(`
      SELECT r.*, u.name as author_name, u.role as author_role
      FROM forum_replies r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `, [replyId]);
    }
    static async deleteReply(replyId, userId, role) {
        const reply = await get('SELECT * FROM forum_replies WHERE id = ?', [replyId]);
        if (!reply)
            throw new AppError(404, 'Reply not found');
        if (reply.user_id !== userId && role !== 'admin') {
            throw new AppError(403, 'Not authorized to delete this reply');
        }
        await run('DELETE FROM forum_replies WHERE id = ?', [replyId]);
    }
    static async updatePost(postId, userId, role, data) {
        const post = await get('SELECT * FROM forum_posts WHERE id = ?', [postId]);
        if (!post)
            throw new AppError(404, 'Post not found');
        if (post.user_id !== userId && role !== 'admin') {
            throw new AppError(403, 'Not authorized to edit this post');
        }
        await run('UPDATE forum_posts SET title = COALESCE(?, title), content = COALESCE(?, content) WHERE id = ?', [data.title || null, data.content || null, postId]);
        return await get(`
      SELECT p.*, u.name as author_name, u.role as author_role
      FROM forum_posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [postId]);
    }
    static async deletePost(postId, userId, role) {
        const post = await get('SELECT * FROM forum_posts WHERE id = ?', [postId]);
        if (!post)
            throw new AppError(404, 'Post not found');
        if (post.user_id !== userId && role !== 'admin') {
            throw new AppError(403, 'Not authorized to delete this post');
        }
        await run('DELETE FROM forum_posts WHERE id = ?', [postId]);
    }
}
