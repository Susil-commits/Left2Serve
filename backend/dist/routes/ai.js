import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
const router = Router();
router.post('/describe', authMiddleware, roleMiddleware('donor'), async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.status(503).json({ error: 'AI features are not configured' });
        }
        const { title, category } = req.body;
        if (!title || !category) {
            return res.status(400).json({ error: 'Title and category are required' });
        }
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `Write a short, engaging description for a food donation listing.
Title: ${title}
Category: ${category}
Keep it under 3 sentences, professional, and empathetic. Do not include quotes around the text.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        res.json({ description: response.text });
    }
    catch (err) {
        console.error('AI Error:', err);
        res.status(500).json({ error: 'Failed to generate description' });
    }
});
export default router;
