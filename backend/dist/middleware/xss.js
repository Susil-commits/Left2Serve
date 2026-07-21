import xss from 'xss';
const sanitize = (data) => {
    if (typeof data === 'string') {
        return xss(data);
    }
    if (Array.isArray(data)) {
        return data.map((item) => sanitize(item));
    }
    if (typeof data === 'object' && data !== null) {
        const sanitizedObj = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                sanitizedObj[key] = sanitize(data[key]);
            }
        }
        return sanitizedObj;
    }
    return data;
};
export const xssClean = (req, res, next) => {
    if (req.body)
        req.body = sanitize(req.body);
    if (req.query)
        req.query = sanitize(req.query);
    if (req.params)
        req.params = sanitize(req.params);
    next();
};
