const {
  getUser,
} = require('../libs/getUser');

// Require Active Session Middleware
module.exports = async (req, res, next) => {
  // Get Authorization Header
  const token = req.header('Authorization') || '';
  const respUser = getUser(req, res, token);
  req.user = respUser;
  return next();
};
