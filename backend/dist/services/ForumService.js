import { prisma } from '../db/database.js';
import { AppError } from '../utils/AppError.js';
export class ForumService {
    static async getCategories(role) {
        const categories = await prisma.forumCategory.findMany({
            orderBy: { id: 'asc' },
        });
        return categories.filter((c) => {
            try {
                const roles = Array.isArray(c.read_roles) ? c.read_roles : typeof c.read_roles === 'string' ? JSON.parse(c.read_roles) : c.read_roles;
                return roles.includes(role);
            }
            catch {
                return false;
            }
        });
    }
    static async getPostsInCategory(categoryId, role) {
        const category = await prisma.forumCategory.findUnique({
            where: { id: categoryId },
        });
        if (!category)
            throw new AppError(404, 'Category not found');
        let readRoles = [];
        try {
            readRoles = Array.isArray(category.read_roles) ? category.read_roles : typeof category.read_roles === 'string' ? JSON.parse(category.read_roles) : category.read_roles;
        }
        catch { }
        if (!readRoles.includes(role)) {
            throw new AppError(403, 'You do not have permission to view this category');
        }
        const posts = await prisma.forumPost.findMany({
            where: { category_id: category.id },
            include: {
                user: { select: { name: true, role: true } },
                _count: { select: { replies: true } },
            },
            orderBy: { created_at: 'desc' },
        });
        const formattedPosts = posts.map(p => ({
            ...p,
            author_name: p.user.name,
            author_role: p.user.role,
            reply_count: p._count.replies,
            user: undefined,
            _count: undefined,
        }));
        return { category, posts: formattedPosts };
    }
    static async createPost(categoryId, userId, role, data) {
        const { title, content } = data;
        const category = await prisma.forumCategory.findUnique({ where: { id: categoryId } });
        if (!category)
            throw new AppError(404, 'Category not found');
        let writeRoles = [];
        try {
            writeRoles = Array.isArray(category.write_roles) ? category.write_roles : typeof category.write_roles === 'string' ? JSON.parse(category.write_roles) : category.write_roles;
        }
        catch { }
        if (!writeRoles.includes(role)) {
            throw new AppError(403, 'You do not have permission to post in this category');
        }
        const post = await prisma.forumPost.create({
            data: {
                category_id: category.id,
                user_id: userId,
                title,
                content,
            }
        });
        return post;
    }
    static async getPostDetails(postId, role) {
        const post = await prisma.forumPost.findUnique({
            where: { id: postId },
            include: {
                user: { select: { name: true, role: true } },
                category: { select: { read_roles: true } },
            }
        });
        if (!post)
            throw new AppError(404, 'Post not found');
        let readRoles = [];
        try {
            readRoles = Array.isArray(post.category.read_roles) ? post.category.read_roles : typeof post.category.read_roles === 'string' ? JSON.parse(post.category.read_roles) : post.category.read_roles;
        }
        catch { }
        if (!readRoles.includes(role)) {
            throw new AppError(403, 'You do not have permission to view this post');
        }
        const formattedPost = {
            ...post,
            author_name: post.user.name,
            author_role: post.user.role,
            user: undefined,
            category: undefined,
        };
        const replies = await prisma.forumReply.findMany({
            where: { post_id: post.id },
            include: { user: { select: { name: true, role: true } } },
            orderBy: { created_at: 'asc' }
        });
        const formattedReplies = replies.map(r => ({
            ...r,
            author_name: r.user.name,
            author_role: r.user.role,
            user: undefined,
        }));
        return { post: formattedPost, replies: formattedReplies };
    }
    static async createReply(postId, userId, role, content) {
        const post = await prisma.forumPost.findUnique({
            where: { id: postId },
            include: { category: { select: { write_roles: true } } }
        });
        if (!post)
            throw new AppError(404, 'Post not found');
        let writeRoles = [];
        try {
            writeRoles = Array.isArray(post.category.write_roles) ? post.category.write_roles : typeof post.category.write_roles === 'string' ? JSON.parse(post.category.write_roles) : post.category.write_roles;
        }
        catch { }
        if (!writeRoles.includes(role)) {
            throw new AppError(403, 'You do not have permission to reply in this category');
        }
        const reply = await prisma.forumReply.create({
            data: {
                post_id: post.id,
                user_id: userId,
                content,
            },
            include: {
                user: { select: { name: true, role: true } }
            }
        });
        return {
            ...reply,
            author_name: reply.user.name,
            author_role: reply.user.role,
            user: undefined,
        };
    }
    static async updateReply(replyId, userId, role, content) {
        const reply = await prisma.forumReply.findUnique({ where: { id: replyId } });
        if (!reply)
            throw new AppError(404, 'Reply not found');
        if (reply.user_id !== userId && role !== 'admin') {
            throw new AppError(403, 'Not authorized to edit this reply');
        }
        const updatedReply = await prisma.forumReply.update({
            where: { id: replyId },
            data: { content },
            include: { user: { select: { name: true, role: true } } }
        });
        return {
            ...updatedReply,
            author_name: updatedReply.user.name,
            author_role: updatedReply.user.role,
            user: undefined,
        };
    }
    static async deleteReply(replyId, userId, role) {
        const reply = await prisma.forumReply.findUnique({ where: { id: replyId } });
        if (!reply)
            throw new AppError(404, 'Reply not found');
        if (reply.user_id !== userId && role !== 'admin') {
            throw new AppError(403, 'Not authorized to delete this reply');
        }
        await prisma.forumReply.delete({ where: { id: replyId } });
    }
    static async updatePost(postId, userId, role, data) {
        const post = await prisma.forumPost.findUnique({ where: { id: postId } });
        if (!post)
            throw new AppError(404, 'Post not found');
        if (post.user_id !== userId && role !== 'admin') {
            throw new AppError(403, 'Not authorized to edit this post');
        }
        const updatedPost = await prisma.forumPost.update({
            where: { id: postId },
            data: {
                title: data.title ?? undefined,
                content: data.content ?? undefined
            },
            include: { user: { select: { name: true, role: true } } }
        });
        return {
            ...updatedPost,
            author_name: updatedPost.user.name,
            author_role: updatedPost.user.role,
            user: undefined,
        };
    }
    static async deletePost(postId, userId, role) {
        const post = await prisma.forumPost.findUnique({ where: { id: postId } });
        if (!post)
            throw new AppError(404, 'Post not found');
        if (post.user_id !== userId && role !== 'admin') {
            throw new AppError(403, 'Not authorized to delete this post');
        }
        await prisma.forumPost.delete({ where: { id: postId } });
    }
}
