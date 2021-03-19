const logger = require('../log');
const cache = require('../cache');

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
  flushAll,
  batchDeleteKeysByPattern,
};
