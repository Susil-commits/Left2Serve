import { WatchlistService } from '../services/WatchlistService.js';
export class WatchlistController {
    static async getUserWatchlists(req, res, next) {
        try {
            const lists = await WatchlistService.getUserWatchlists(req.user.id);
            res.json(lists);
        }
        catch (err) {
            next(err);
        }
    }
    static async createWatchlist(req, res, next) {
        try {
            const w = await WatchlistService.createWatchlist(req.user.id, req.body);
            res.status(201).json(w);
        }
        catch (err) {
            next(err);
        }
    }
    static async deleteWatchlist(req, res, next) {
        try {
            await WatchlistService.deleteWatchlist(req.params.id, req.user.id);
            res.json({ message: 'Deleted successfully' });
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
