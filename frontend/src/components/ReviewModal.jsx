import { useState } from 'react';
import { api } from '../api';
import { useToast } from './Toast';

export default function ReviewModal({ open, onClose, reservationId, revieweeName, foodTitle, onSubmitted }) {
  const { addToast } = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) { addToast('Please select a star rating', 'error'); return; }
    setLoading(true);
    try {
      await api.reviews.create({ reservationId, rating, comment: comment || null });
      addToast('Review submitted. Thank you!', 'success');
      onSubmitted?.();
      setRating(0); setHover(0); setComment('');
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to submit review', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-7 animate-scale-in">
        <h3 id="review-title" className="text-lg font-bold text-text">Rate your experience</h3>
        <p className="text-subtle text-sm mt-1.5 leading-relaxed">
          How was your interaction with <span className="font-semibold text-text">{revieweeName || 'this user'}</span>
          {foodTitle ? <> for <span className="font-semibold text-text">"{foodTitle}"</span></> : null}?
        </p>
        <form onSubmit={submit} className="mt-6 space-y-5">
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button type="button" key={s} onClick={() => setRating(s)} onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)} aria-label={`${s} star${s > 1 ? 's' : ''}`}
                className="p-1 transition-transform hover:scale-110">
                <svg className={`w-9 h-9 ${(hover || rating) >= s ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </button>
            ))}
          </div>
          <div>
            <label className="block text-sm font-semibold text-text mb-2">Comment (optional)</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={500} className="input-field" placeholder="Share details about the pickup, food quality, communication..." />
            <div className="text-right text-[10px] text-muted mt-1">{comment.length}/500</div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-outline flex-1 !py-3 !rounded-2xl">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 !py-3 !rounded-2xl text-base disabled:opacity-50">
              {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting...</span> : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
