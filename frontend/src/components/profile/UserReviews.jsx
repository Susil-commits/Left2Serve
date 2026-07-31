
import StarRating from '../StarRating';

export default function UserReviews({ user, reviews }) {
  if (user?.role === 'admin') return null;

  return (
    <div className="premium-card-elevated p-6 sm:p-8 mt-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-text">Reviews</h3>
        {reviews.count > 0 && <StarRating value={reviews.average} size="sm" showValue count={reviews.count} />}
      </div>
      {reviews.count === 0 ? (
        <p className="text-subtle text-sm">No reviews yet. Reviews appear here after completed pickups transactions.</p>
      ) : (
        <div className="space-y-3">
          {reviews.reviews.map((rv) => (
            <div key={rv.id} className="bg-gray-50 rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-text">{rv.reviewer_name || 'Anonymous'}</div>
                <StarRating value={rv.rating} size="sm" />
              </div>
              {rv.comment && <p className="text-subtle text-sm leading-relaxed">{rv.comment}</p>}
              {rv.food_title && <p className="text-xs text-muted mt-2">on "{rv.food_title}"</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
