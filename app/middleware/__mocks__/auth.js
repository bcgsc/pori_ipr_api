const {
  getUser,
} = require('../../libs/getUser');

// Require Active Session Middleware
module.exports = async (req, res, next) => {
  // Get Authorization Header
  const respUser = await getUser(req, res);
  req.user = respUser;

  // Override authorization in order to mock permissions
  if (req.query.groups) {
    req.user.groups = [req.query.groups];
  }

  if (req.query.projects) {
    req.user.projects = [req.query.projects];
  }

  return next();
};
