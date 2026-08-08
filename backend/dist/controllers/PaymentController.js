import { PaymentService, RAZORPAY_CONFIGURED } from '../services/PaymentService.js';
export class PaymentController {
    static getConfig(req, res) {
        res.json({ configured: RAZORPAY_CONFIGURED, key_id: RAZORPAY_CONFIGURED ? process.env.RAZORPAY_KEY_ID : null });
    }
    static async createOrder(req, res, next) {
        if (!RAZORPAY_CONFIGURED) {
            res.status(503).json({ error: 'Razorpay is not configured on the server' });
            return;
        }
        try {
            const order = await PaymentService.createOrder(req.user.id, req.body);
            res.status(201).json(order);
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
    static async verifyPayment(req, res, next) {
        if (!RAZORPAY_CONFIGURED) {
            res.status(503).json({ error: 'Razorpay is not configured on the server' });
            return;
        }
        try {
            const result = await PaymentService.verifyPayment(req.user.id, req.body);
            res.json(result);
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
