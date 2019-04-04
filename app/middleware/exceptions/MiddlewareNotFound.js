class MiddlewareNotFound extends Error {
  constructor(m, req, res, code = '') {
    const response = {error: {message: m, exception: 'MiddlewareNotFound'}};
    if (code !== '') {
      response.error.code = code;
    }

    // Send Response Message
    res.status(404).json(response);

    // Invoke stderr response
    super(m);
  }
}

module.exports = MiddlewareNotFound;
