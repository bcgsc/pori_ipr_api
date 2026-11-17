const http = require('http');
const https = require('https');

/**
 * Makes a http/https request, based on the
 * provided URL, and returns the response
 *
 * @param {object} options - Request options
 * @property {string} options.url - The URL to make the request to (must start with http or https)
 * @property {string|Buffer|Uint8Array} options.body - Request body
 * @property {boolean} options.json - Whether to try and convert the response to an object
 * @property {boolean} options.throwOnHTTPError - Reject on non-2xx HTTP status (default: false)
 * @property {string} options.method - Request method (i.e POST)
 * @property {object} options.headers - Request headers
 * @returns {Promise<object|string>} - Returns the response
 */
module.exports = (options) => {
  const {url, body, json, throwOnHTTPError = false, ...opts} = options;
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('No url provided'));
    }

    const req = (url.startsWith('https') ? https : http)
      .request(new URL(url), opts, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (throwOnHTTPError && (res.statusCode < 200 || res.statusCode >= 300)) {
            reject(new Error(`Request to ${url} failed with status ${res.statusCode}: ${data}`));
            return;
          }

          if (!data) {
            resolve(null);
            return;
          }

          try {
            resolve(json ? JSON.parse(data) : data);
          } catch (error) {
            resolve(data);
          }
        });
      });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(body);
    }

    req.end();
  });
};
