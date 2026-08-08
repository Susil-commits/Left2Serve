import { AIService } from '../services/AIService.js';
export class AIController {
    static async describe(req, res, next) {
        try {
            const description = await AIService.generateDescription(req.body.title, req.body.category);
            res.json(description);
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
