package services

import (
	"context"
	"database/sql"
	"math"
	"strings"

	"left2serve/backend/database"
	"left2serve/backend/models"
	"left2serve/backend/utils"
)

type ReviewService struct{}

var GlobalReviewService = &ReviewService{}

func (s *ReviewService) CreateReview(ctx context.Context, userID int, req *models.CreateReviewRequest) (*models.Review, error) {
	var foodListingID, resUserID int
	var status string
	err := database.DB.QueryRowContext(ctx, "SELECT food_listing_id, user_id, status FROM reservations WHERE id = $1", req.ReservationID).Scan(&foodListingID, &resUserID, &status)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, utils.NotFound("Reservation not found")
		}
		return nil, err
	}

	var donorID int
	var foodTitle string
	err = database.DB.QueryRowContext(ctx, "SELECT user_id, title FROM food_listings WHERE id = $1", foodListingID).Scan(&donorID, &foodTitle)
	if err != nil {
		return nil, utils.NotFound("Listing not found")
	}

	isDonor := donorID == userID
	isReceiver := resUserID == userID

	if !isDonor && !isReceiver {
		return nil, utils.Forbidden("Not authorized to review this reservation")
	}
	if status != "collected" {
		return nil, utils.BadRequest("You can only review after the pickup is completed")
	}

	revieweeID := donorID
	if isDonor {
		revieweeID = resUserID
	}
	if revieweeID == userID {
		return nil, utils.BadRequest("You cannot review yourself")
	}

	var existingID int
	err = database.DB.QueryRowContext(ctx, "SELECT id FROM reviews WHERE reservation_id = $1 AND reviewer_id = $2", req.ReservationID, userID).Scan(&existingID)
	if err == nil {
		return nil, utils.Conflict("You have already reviewed this reservation")
	}

	var comment *string
	if req.Comment != nil {
		c := strings.TrimSpace(*req.Comment)
		if len(c) > 500 {
			c = c[:500]
		}
		comment = &c
	}

	var reviewID int
	err = database.DB.QueryRowContext(ctx, `
		INSERT INTO reviews (reservation_id, listing_id, reviewer_id, reviewee_id, rating, comment) 
		VALUES ($1, $2, $3, $4, $5, $6) 
		RETURNING id`,
		req.ReservationID, foodListingID, userID, revieweeID, req.Rating, comment,
	).Scan(&reviewID)
	if err != nil {
		return nil, err
	}

	var review models.Review
	err = database.DB.QueryRowContext(ctx, "SELECT id, reservation_id, listing_id, reviewer_id, reviewee_id, rating, comment, created_at FROM reviews WHERE id = $1", reviewID).Scan(
		&review.ID, &review.ReservationID, &review.ListingID, &review.ReviewerID, &review.RevieweeID, &review.Rating, &review.Comment, &review.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &review, nil
}

func (s *ReviewService) GetReservationReviewInfo(ctx context.Context, reservationID, userID int) (*models.ReservationReviewInfo, error) {
	var foodListingID, resUserID int
	var status string
	err := database.DB.QueryRowContext(ctx, "SELECT food_listing_id, user_id, status FROM reservations WHERE id = $1", reservationID).Scan(&foodListingID, &resUserID, &status)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, utils.NotFound("Reservation not found")
		}
		return nil, err
	}

	var donorID int
	var foodTitle string
	err = database.DB.QueryRowContext(ctx, "SELECT user_id, title FROM food_listings WHERE id = $1", foodListingID).Scan(&donorID, &foodTitle)
	if err != nil {
		return &models.ReservationReviewInfo{CanReview: false}, nil
	}

	isDonor := donorID == userID
	isReceiver := resUserID == userID
	if !isDonor && !isReceiver {
		return &models.ReservationReviewInfo{CanReview: false}, nil
	}

	revieweeID := donorID
	if isDonor {
		revieweeID = resUserID
	}

	var reviewee models.SafeUser
	_ = database.DB.QueryRowContext(ctx, "SELECT id, name, organization, role FROM users WHERE id = $1", revieweeID).Scan(
		&reviewee.ID, &reviewee.Name, &reviewee.Organization, &reviewee.Role,
	)

	var myReview models.Review
	err = database.DB.QueryRowContext(ctx, "SELECT id, reservation_id, listing_id, reviewer_id, reviewee_id, rating, comment, created_at FROM reviews WHERE reservation_id = $1 AND reviewer_id = $2", reservationID, userID).Scan(
		&myReview.ID, &myReview.ReservationID, &myReview.ListingID, &myReview.ReviewerID, &myReview.RevieweeID, &myReview.Rating, &myReview.Comment, &myReview.CreatedAt,
	)

	var reviewPtr *models.Review
	if err == nil {
		reviewPtr = &myReview
	}

	canReview := status == "collected" && reviewPtr == nil

	return &models.ReservationReviewInfo{
		CanReview:     canReview,
		MyReview:      reviewPtr,
		Reviewee:      &reviewee,
		FoodTitle:     foodTitle,
		ReservationID: reservationID,
	}, nil
}

func (s *ReviewService) GetUserReviews(ctx context.Context, userID int) (*models.UserReviewsResponse, error) {
	rows, err := database.DB.QueryContext(ctx, `
		SELECT rv.id, rv.reservation_id, rv.listing_id, rv.reviewer_id, rv.reviewee_id, 
		       rv.rating, rv.comment, rv.created_at, u.name as reviewer_name, 
		       u.role as reviewer_role, fl.title as food_title 
		FROM reviews rv 
		JOIN users u ON rv.reviewer_id = u.id 
		LEFT JOIN food_listings fl ON rv.listing_id = fl.id 
		WHERE rv.reviewee_id = $1 
		ORDER BY rv.created_at DESC`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	reviews := make([]models.Review, 0)
	var sumRating float64
	for rows.Next() {
		var r models.Review
		var reviewerName, reviewerRole, foodTitle sql.NullString

		if err := rows.Scan(
			&r.ID, &r.ReservationID, &r.ListingID, &r.ReviewerID, &r.RevieweeID,
			&r.Rating, &r.Comment, &r.CreatedAt, &reviewerName, &reviewerRole, &foodTitle,
		); err != nil {
			return nil, err
		}

		if reviewerName.Valid {
			r.ReviewerName = &reviewerName.String
		}
		if reviewerRole.Valid {
			r.ReviewerRole = &reviewerRole.String
		}
		if foodTitle.Valid {
			r.FoodTitle = &foodTitle.String
		}

		sumRating += float64(r.Rating)
		reviews = append(reviews, r)
	}

	count := len(reviews)
	average := 0.0
	if count > 0 {
		average = math.Round((sumRating/float64(count))*10.0) / 10.0
	}

	return &models.UserReviewsResponse{
		Average: average,
		Count:   count,
		Reviews: reviews,
	}, nil
}
