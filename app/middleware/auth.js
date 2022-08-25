const {
  getUser,
} = require('../libs/getUser');

// Require Active Session Middleware
module.exports = async (req, res, next) => {
  // Get Authorization Header
  const respUser = await getUser(req, res);
  req.user = respUser;
  return next();
};
