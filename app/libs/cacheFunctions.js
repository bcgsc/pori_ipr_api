const logger = require('../log');
const cache = require('../cache');

/**
 * Generates a cache key based on route, query parameters
 * and any extra parameters.
 *
 * @param {string} route - Route used for caching
 * @param {object} params - Query parameters of request
 * @param {object} extra - Extra parameters
 * @returns {string} - Returns a generated key
 */
const generateKey = (route, params, extra = {}) => {
  Object.assign(params, extra);

  if (!Object.keys(params).length) {
    return route;
  }

  return `${route}?${Object.keys(params).sort().map((value) => {
    return `${value}=${params[value].toString().toLowerCase().split(',').sort().join(',')}`;
  }).join('&')}`;
};

/**
 * Remove all keys from the cache.
 *
 * @returns {Promise<string>} - Returns Promise<"OK">
 */
const flushAll = async () => {
  return cache.flushall();
};

/**
 * Remove all keys from the cache that follow the
 * provided pattern.
 *
 * @param {string} pattern - Pattern to match keys to
 * @returns {undefined}
 */
const batchDeleteKeysByPattern = async (pattern) => {
  return new Promise((resolve, reject) => {
    const stream = cache.scanStream({
      // only returns keys following the pattern of "key"
      match: pattern,
      // returns approximately 100 elements per call
      count: 100,
    });

    stream.on('data', async (keys) => {
      if (keys.length) {
        try {
          await cache.unlink(keys);
        } catch (error) {
          logger.error(`Error during unlinking ${error}`);
          reject(error);
        }
      }
    });

    stream.on('error', (error) => {
      logger.error(`Error during batch cache delete ${error}`);
      reject(error);
    });

    stream.on('end', () => {
      resolve();
    });
  });
};

module.exports = {
  generateKey,
  flushAll,
  batchDeleteKeysByPattern,
};
