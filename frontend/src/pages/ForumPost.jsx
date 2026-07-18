import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../components/AuthContext';

export default function ForumPost() {
  const { postId } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState({ post: null, replies: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newReply, setNewReply] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Edit post state
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editPostForm, setEditPostForm] = useState({ title: '', content: '' });
  
  // Edit reply state
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editReplyContent, setEditReplyContent] = useState('');

  useEffect(() => {
    loadPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function loadPost() {
    try {
      setLoading(true);
      const res = await api.forum.getPost(postId);
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleReply = async (e) => {
    e.preventDefault();
    if (!newReply.trim()) return;
    setSubmitting(true);
    try {
      await api.forum.createReply(postId, { content: newReply });
      setNewReply('');
      loadPost(); // Reload to get new reply
    } catch (err) {
      alert(err.message || 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPost = async (e) => {
    e.preventDefault();
    if (!editPostForm.title.trim() || !editPostForm.content.trim()) return;
    try {
      await api.forum.updatePost(postId, editPostForm);
      setIsEditingPost(false);
      loadPost();
    } catch (err) {
      alert(err.message || 'Failed to update post');
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await api.forum.deletePost(postId);
      window.location.href = `/forum/${data.post.category_id}`;
    } catch (err) {
      alert(err.message || 'Failed to delete post');
    }
  };

  const handleEditReply = async (e, replyId) => {
    e.preventDefault();
    if (!editReplyContent.trim()) return;
    try {
      await api.forum.updateReply(replyId, { content: editReplyContent });
      setEditingReplyId(null);
      loadPost();
    } catch (err) {
      alert(err.message || 'Failed to update reply');
    }
  };

  const handleDeleteReply = async (replyId) => {
    if (!window.confirm('Are you sure you want to delete this reply?')) return;
    try {
      await api.forum.deleteReply(replyId);
      loadPost();
    } catch (err) {
      alert(err.message || 'Failed to delete reply');
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-accent/5 border border-accent/10 text-accent p-6 rounded-2xl">
          <h3 className="font-semibold text-lg">Error loading post</h3>
          <p>{error}</p>
          <Link to="/forum" className="text-sm underline mt-2 inline-block">Back to Forum</Link>
        </div>
      </div>
    );
  }

  const { post, replies } = data;
  
  // Can we reply? We can check if our role is in write_roles of this category.
  // Wait, backend will enforce this on the POST, but for UI:
  // (We don't strictly have category write_roles in this payload, but the backend rejects it.
  // For simplicity, we just show the reply box and let the backend 403 if they can't.)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-transition">
      <Link to={`/forum/${post.category_id}`} className="text-sm font-medium text-subtle hover:text-accent flex items-center gap-1 mb-6">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Back to Category
      </Link>

      <div className="premium-card p-6 sm:p-8 mb-8">
        {!isEditingPost ? (
          <>
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-text">{post.title}</h1>
              {(user?.id === post.user_id || user?.role === 'admin') && (
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => { setIsEditingPost(true); setEditPostForm({ title: post.title, content: post.content }); }} className="text-sm font-medium text-accent hover:underline">Edit</button>
                  <button onClick={handleDeletePost} className="text-sm font-medium text-red-500 hover:underline">Delete</button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">
                {post.author_name[0]}
              </div>
              <div>
                <div className="font-semibold text-text">{post.author_name}</div>
                <div className="text-xs text-subtle flex items-center gap-2">
                  <span className="capitalize">{post.author_role}</span>
                  <span>•</span>
                  <span>{new Date(post.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="prose prose-sm sm:prose-base max-w-none text-text whitespace-pre-wrap">
              {post.content}
            </div>
          </>
        ) : (
          <form onSubmit={handleEditPost} className="space-y-4">
            <input type="text" value={editPostForm.title} onChange={e => setEditPostForm(f => ({ ...f, title: e.target.value }))} className="input-field font-bold text-xl" required />
            <textarea value={editPostForm.content} onChange={e => setEditPostForm(f => ({ ...f, content: e.target.value }))} className="input-field" rows={5} required></textarea>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setIsEditingPost(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Save Changes</button>
            </div>
          </form>
        )}
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-bold text-text">Replies ({replies.length})</h3>
        
        {replies.map((reply, idx) => (
          <div key={reply.id} className="premium-card p-5 sm:p-6 ml-0 sm:ml-8 animate-scale-in" style={{ animationDelay: `${idx * 0.05}s` }}>
            {editingReplyId === reply.id ? (
              <form onSubmit={(e) => handleEditReply(e, reply.id)} className="space-y-3">
                <textarea value={editReplyContent} onChange={e => setEditReplyContent(e.target.value)} className="input-field" rows={3} required></textarea>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setEditingReplyId(null)} className="btn-secondary !py-1 !px-4 text-sm">Cancel</button>
                  <button type="submit" className="btn-primary !py-1 !px-4 text-sm">Save</button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm">
                      {reply.author_name[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-text text-sm">{reply.author_name}</div>
                      <div className="text-xs text-subtle flex items-center gap-2">
                        <span className="capitalize">{reply.author_role}</span>
                        <span>•</span>
                        <span>{new Date(reply.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  {(user?.id === reply.user_id || user?.role === 'admin') && (
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingReplyId(reply.id); setEditReplyContent(reply.content); }} className="text-xs font-medium text-accent hover:underline">Edit</button>
                      <button onClick={() => handleDeleteReply(reply.id)} className="text-xs font-medium text-red-500 hover:underline">Delete</button>
                    </div>
                  )}
                </div>
                <div className="text-text text-sm sm:text-base whitespace-pre-wrap">
                  {reply.content}
                </div>
              </>
            )}
          </div>
        ))}

        <div className="ml-0 sm:ml-8 mt-8 premium-card p-5 sm:p-6 bg-gray-50/50">
          <h4 className="font-semibold text-text mb-3">Write a Reply</h4>
          <form onSubmit={handleReply}>
            <textarea 
              value={newReply} 
              onChange={e => setNewReply(e.target.value)} 
              required 
              rows={3} 
              className="input-field bg-white" 
              placeholder="Add to the discussion..."
            ></textarea>
            <div className="flex justify-end mt-3">
              <button type="submit" disabled={submitting} className="btn-primary !py-2 !px-6 text-sm">
                {submitting ? 'Posting...' : 'Reply'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
