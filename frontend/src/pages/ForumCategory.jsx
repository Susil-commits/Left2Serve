import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../components/AuthContext';

export default function ForumCategory() {
  const { categoryId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ category: null, posts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showNewPost, setShowNewPost] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  async function loadPosts() {
    try {
      setLoading(true);
      const res = await api.forum.getCategoryPosts(categoryId);
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    setSubmitting(true);
    try {
      await api.forum.createPost(categoryId, { title: newTitle, content: newContent });
      setNewTitle('');
      setNewContent('');
      setShowNewPost(false);
      loadPosts(); // Reload to show new post
    } catch (err) {
      alert(err.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-accent/5 border border-accent/10 text-accent p-6 rounded-2xl">
          <h3 className="font-semibold text-lg">Error loading category</h3>
          <p>{error}</p>
          <Link to="/forum" className="text-sm underline mt-2 inline-block">Back to Forum</Link>
        </div>
      </div>
    );
  }

  const { category, posts } = data;
  let canWrite = false;
  try {
    const roles = typeof category.write_roles === 'string' ? JSON.parse(category.write_roles) : category.write_roles;
    canWrite = roles.includes(user.role);
  } catch { }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-transition">
      <Link to="/forum" className="text-sm font-medium text-subtle hover:text-accent flex items-center gap-1 mb-6">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Back to Forum
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text">{category.name}</h1>
          <p className="text-subtle mt-2">{category.description}</p>
        </div>
        {canWrite && (
          <button onClick={() => setShowNewPost(!showNewPost)} className="btn-primary !py-2 !px-4 !rounded-xl whitespace-nowrap">
            {showNewPost ? 'Cancel' : 'New Post'}
          </button>
        )}
      </div>

      {showNewPost && canWrite && (
        <form onSubmit={handleCreatePost} className="premium-card p-6 mb-8 animate-slide-down">
          <h3 className="text-lg font-bold mb-4">Create a New Post</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Title</label>
              <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} required className="input-field" placeholder="Post title" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Content</label>
              <textarea value={newContent} onChange={e => setNewContent(e.target.value)} required rows={4} className="input-field" placeholder="What's on your mind?"></textarea>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="premium-card p-8 text-center text-subtle">
            No posts in this category yet. {canWrite && 'Be the first to post!'}
          </div>
        ) : (
          posts.map(post => (
            <Link key={post.id} to={`/forum/post/${post.id}`} className="premium-card p-4 sm:p-6 flex flex-col group hover:-translate-y-1 transition-all">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-lg font-bold text-text group-hover:text-accent transition-colors">{post.title}</h3>
                  <div className="flex items-center gap-2 mt-2 text-xs text-subtle">
                    <span className="font-medium text-text">{post.author_name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 capitalize">{post.author_role}</span>
                    <span>•</span>
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-subtle text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  {post.reply_count}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
