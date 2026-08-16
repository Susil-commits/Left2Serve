import { AIService } from '../services/AIService.js';
import { AIGuardrailChatService } from '../services/AIGuardrailChatService.js';
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
    static async chat(req, res, next) {
        try {
            const { message, history } = req.body;
            if (!message || typeof message !== 'string') {
                res.status(400).json({ error: 'A valid "message" string is required.' });
                return;
            }
            const response = await AIGuardrailChatService.chat(message, Array.isArray(history) ? history : []);
            res.json(response);
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
