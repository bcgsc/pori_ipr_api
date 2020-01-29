const HTTP_STATUS = require('http-status-codes');

class MiddlewareQueryFailed extends Error {
  constructor(m, req, res, code = '') {
    const response = {error: {message: m, exception: 'MiddlewareQueryFailed'}};
    if (code !== '') {
      response.error.code = code;
    }

    // Send Response Message
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(response);

    // Invoke stderr response
    super(m);
  }
}

module.exports = MiddlewareQueryFailed;
