export const validate = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    }
    catch (err) {
        if (err.errors) {
            const errorMessages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ error: errorMessages });
        }
        else {
            res.status(400).json({ error: 'Invalid request body' });
        }
    }
};
