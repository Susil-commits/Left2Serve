package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"left2serve/backend/database"
)

type BadgeTier struct {
	ID        string
	Threshold int
	Name      string
	Icon      string
}

var BadgeTiers = []BadgeTier{
	{ID: "bronze", Threshold: 10, Name: "Bronze Donor", Icon: "🥉"},
	{ID: "silver", Threshold: 50, Name: "Silver Donor", Icon: "🥈"},
	{ID: "gold", Threshold: 100, Name: "Gold Donor", Icon: "🥇"},
	{ID: "platinum", Threshold: 500, Name: "Platinum Donor", Icon: "💎"},
	{ID: "eco_hero", Threshold: 1000, Name: "Eco Hero", Icon: "🌍"},
}

type BadgeService struct{}

var GlobalBadgeService = &BadgeService{}

func (s *BadgeService) AddMealsAndCheckBadges(ctx context.Context, userID, quantity int) error {
	var mealsSaved int
	var rawBadges []byte

	err := database.DB.QueryRowContext(ctx, "SELECT COALESCE(meals_saved, 0), badges FROM users WHERE id = $1", userID).Scan(&mealsSaved, &rawBadges)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil
		}
		return err
	}

	newMealsSaved := mealsSaved + quantity

	currentBadges := make([]string, 0)
	if len(rawBadges) > 0 {
		_ = json.Unmarshal(rawBadges, &currentBadges)
	}

	badgeMap := make(map[string]bool)
	for _, b := range currentBadges {
		badgeMap[b] = true
	}

	updatedBadges := append([]string{}, currentBadges...)

	for _, tier := range BadgeTiers {
		if newMealsSaved >= tier.Threshold && !badgeMap[tier.ID] {
			updatedBadges = append(updatedBadges, tier.ID)
			badgeMap[tier.ID] = true

			_ = GlobalNotificationService.CreateNotification(
				ctx,
				userID,
				"badge_earned",
				"New Badge Earned! 🎉",
				fmt.Sprintf("Congratulations! You've saved %d meals and earned the %s %s badge!", newMealsSaved, tier.Name, tier.Icon),
				map[string]any{
					"badgeId":       tier.ID,
					"newMealsSaved": newMealsSaved,
				},
			)
		}
	}

	updatedBadgesBytes, _ := json.Marshal(updatedBadges)
	_, err = database.DB.ExecContext(ctx, "UPDATE users SET meals_saved = $1, badges = $2 WHERE id = $3", newMealsSaved, updatedBadgesBytes, userID)
	return err
}
