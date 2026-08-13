import { GoogleGenAI, Type } from '@google/genai';
import { AppError } from '../utils/AppError.js';
const VALID_CATEGORIES = ['event', 'restaurant', 'hotel', 'caterer', 'household'];
function getClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new AppError(503, 'GEMINI_API_KEY is not configured. AI features are unavailable.');
    }
    return new GoogleGenAI({ apiKey });
}
export class AIService {
    static async generateDescription(title, category) {
        const ai = getClient();
        if (!title || !category) {
            throw new AppError(400, 'Title and category are required.');
        }
        try {
            const prompt = `Write a short, engaging description for a food donation listing.
Title: ${title}
Category: ${category}
Keep it under 3 sentences, professional, and empathetic. Do not include quotes around the text.`;
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            const text = response.text;
            if (!text || text.trim() === '') {
                throw new AppError(500, 'AI returned an empty description. Please try again.');
            }
            return { description: text.trim() };
        }
        catch (err) {
            const msg = err.message || String(err);
            console.error('AI /describe error:', msg);
            if (msg.includes('API_KEY') || msg.includes('PERMISSION_DENIED')) {
                throw new AppError(503, 'AI service authentication failed.');
            }
            if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
                throw new AppError(429, 'AI quota exceeded. Please try again later.');
            }
            throw new AppError(500, 'Failed to generate description. Please try again.');
        }
    }
    /** Image analysis service */
    static async analyzeFoodImage(imageUrl) {
        if (!imageUrl || typeof imageUrl !== 'string') {
            throw new Error('A valid imageUrl is required for AI analysis.');
        }
        const ai = getClient();
        let base64Data;
        let mimeType;
        try {
            const fetchRes = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
            if (!fetchRes.ok) {
                throw new Error(`Image fetch returned HTTP ${fetchRes.status}`);
            }
            const arrayBuffer = await fetchRes.arrayBuffer();
            if (arrayBuffer.byteLength === 0) {
                throw new Error('Image fetch returned an empty body');
            }
            base64Data = Buffer.from(arrayBuffer).toString('base64');
            mimeType = (fetchRes.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
        }
        catch (err) {
            throw new Error(`Failed to fetch image for analysis: ${err.message}`);
        }
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                title: {
                    type: Type.STRING,
                    description: 'A catchy, descriptive title for the food donation listing.',
                },
                description: {
                    type: Type.STRING,
                    description: 'A detailed description of the food (2–3 sentences).',
                },
                category: {
                    type: Type.STRING,
                    description: 'The most appropriate category. Must be exactly one of: event, restaurant, hotel, caterer, household',
                },
            },
            required: ['title', 'description', 'category'],
        };
        let aiResponse;
        try {
            aiResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    {
                        role: 'user',
                        parts: [
                            {
                                text: 'Analyse this image of surplus food being donated. Return a JSON object with: title (catchy), description (2-3 sentences), and category (one of: event, restaurant, hotel, caterer, household).',
                            },
                            { inlineData: { data: base64Data, mimeType } },
                        ],
                    },
                ],
                config: {
                    responseMimeType: 'application/json',
                    responseSchema,
                },
            });
        }
        catch (err) {
            const msg = err.message || String(err);
            console.error('AI Image Analysis – Gemini call failed:', msg);
            if (msg.includes('API_KEY') || msg.includes('PERMISSION_DENIED')) {
                throw new Error('AI service authentication failed. Check your GEMINI_API_KEY.');
            }
            if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
                throw new Error('AI service quota exceeded. Please try again later.');
            }
            throw new Error(`AI service error: ${msg}`);
        }
        const rawText = aiResponse.text;
        if (!rawText || rawText.trim() === '') {
            throw new Error('AI returned an empty response. Please try again.');
        }
        let parsed;
        try {
            parsed = JSON.parse(rawText);
        }
        catch {
            console.error('AI Image Analysis – malformed JSON from Gemini:', rawText);
            throw new Error('AI returned malformed JSON. Please try again.');
        }
        if (!parsed.title || !parsed.description || !parsed.category) {
            throw new Error('AI response is missing required fields (title, description, category).');
        }
        if (!VALID_CATEGORIES.includes(parsed.category)) {
            parsed.category = 'household';
        }
        return {
            title: String(parsed.title).trim(),
            description: String(parsed.description).trim(),
            category: parsed.category,
        };
    }
}
