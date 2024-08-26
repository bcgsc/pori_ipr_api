const nconf = require('../config');

const {
    getUser,
  } = require('../libs/getAdminCliToken');
  
  // Require Active Session Middleware
  module.exports = async (req, res, next) => {
    const {enableV16UserManagement} = nconf.get('keycloak');
    if (!enableV16UserManagement) {
        return next();
    }

    // Get Authorization Header
    const adminCliToken = await getAdminCliToken(req, res);
    req.adminCliToken = adminCliToken;
    return next();
  };
  