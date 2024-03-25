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
    if (typeof req.query.groups.name === 'object') {
      req.user.groups = [];

      for (const i of req.query.groups.name) {
        req.user.groups.push({name: i});
      }
    } else {
      req.user.groups = [req.query.groups];
    }
  }

  if (req.query.projects) {
    req.user.projects = [req.query.projects];
  }

  return next();
};
