import { ChatService } from '../services/ChatService.js';
export class ChatController {
    static async getMessages(req, res, next) {
        try {
            const messages = await ChatService.getMessages(req.params.reservationId, req.user.id, req.user.role);
            res.json(messages);
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
