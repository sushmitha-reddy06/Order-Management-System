const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); 

const cacheMiddleware = (duration = 300) => {
  return (req, res, next) => {
    const key = req.originalUrl;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      console.log('Cache hit for:', key);
      return res.json(cachedResponse);
    }

    const originalJson = res.json;
    res.json = (body) => {
      cache.set(key, body, duration);
      originalJson.call(res, body);
    };

    next();
  };
};

module.exports = cacheMiddleware;