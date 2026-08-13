import { get, run } from '../db/database.js';
import { createNotification } from '../db/notify.js';
export const BADGE_TIERS = [
    { id: 'bronze', threshold: 10, name: 'Bronze Donor', icon: '🥉' },
    { id: 'silver', threshold: 50, name: 'Silver Donor', icon: '🥈' },
    { id: 'gold', threshold: 100, name: 'Gold Donor', icon: '🥇' },
    { id: 'platinum', threshold: 500, name: 'Platinum Donor', icon: '💎' },
    { id: 'eco_hero', threshold: 1000, name: 'Eco Hero', icon: '🌍' },
];
export class BadgeService {
    /**
     * Adds meals to a user's total and checks if they qualify for a new badge.
     * If they do, assigns the badge and sends a notification.
     */
    static async addMealsAndCheckBadges(userId, quantity) {
        const user = await get('SELECT meals_saved, badges FROM users WHERE id = ?', [userId]);
        if (!user)
            return;
        const newMealsSaved = (user.meals_saved || 0) + quantity;
        const currentBadges = typeof user.badges === 'string' ? JSON.parse(user.badges) : (user.badges || []);
        const newBadgesToAward = BADGE_TIERS.filter(tier => newMealsSaved >= tier.threshold && !currentBadges.includes(tier.id));
        let updatedBadges = [...currentBadges];
        for (const badge of newBadgesToAward) {
            updatedBadges.push(badge.id);
            await createNotification(userId, 'badge_earned', 'New Badge Earned! 🎉', `Congratulations! You've saved ${newMealsSaved} meals and earned the ${badge.name} ${badge.icon} badge!`, { badgeId: badge.id, newMealsSaved });
        }
        await run('UPDATE users SET meals_saved = ?, badges = ? WHERE id = ?', [
            newMealsSaved,
            JSON.stringify(updatedBadges),
            userId
        ]);
    }
}
