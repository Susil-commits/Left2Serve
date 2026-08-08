import { ForumService } from '../services/ForumService.js';
export class ForumController {
    static async getCategories(req, res, next) {
        try {
            const categories = await ForumService.getCategories(req.user.role);
            res.json(categories);
        }
        catch (err) {
            next(err);
        }
    }
    static async getPostsInCategory(req, res, next) {
        try {
            const data = await ForumService.getPostsInCategory(Number(req.params.id), req.user.role);
            res.json(data);
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
            }
            else {
                next(err);
            }
        }
    }
    static async createPost(req, res, next) {
        try {
            const post = await ForumService.createPost(Number(req.params.id), req.user.id, req.user.role, req.body);
            res.status(201).json(post);
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
            }
            else {
                next(err);
            }
        }
    }
    static async getPostDetails(req, res, next) {
        try {
            const data = await ForumService.getPostDetails(Number(req.params.id), req.user.role);
            res.json(data);
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
            }
            else {
                next(err);
            }
        }
    }
    static async createReply(req, res, next) {
        try {
            const reply = await ForumService.createReply(Number(req.params.id), req.user.id, req.user.role, req.body.content);
            res.status(201).json(reply);
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
            }
            else {
                next(err);
            }
        }
    }
    static async updateReply(req, res, next) {
        try {
            const reply = await ForumService.updateReply(Number(req.params.id), req.user.id, req.user.role, req.body.content);
            res.json(reply);
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
            }
            else {
                next(err);
            }
        }
    }
    static async deleteReply(req, res, next) {
        try {
            await ForumService.deleteReply(Number(req.params.id), req.user.id, req.user.role);
            res.json({ message: 'Reply deleted' });
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
            }
            else {
                next(err);
            }
        }
    }
    static async updatePost(req, res, next) {
        try {
            const post = await ForumService.updatePost(Number(req.params.id), req.user.id, req.user.role, req.body);
            res.json(post);
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
            }
            else {
                next(err);
            }
        }
    }
    static async deletePost(req, res, next) {
        try {
            await ForumService.deletePost(Number(req.params.id), req.user.id, req.user.role);
            res.json({ message: 'Post deleted' });
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
            }
            else {
                next(err);
            }
        }
    }
}
