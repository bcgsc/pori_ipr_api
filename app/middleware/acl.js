const {FORBIDDEN} = require('http-status-codes');
const {pathToRegexp} = require('path-to-regexp');
const {isAdmin, isIntersectionBy} = require('../libs/helperFunctions');
const logger = require('../log');

const SPECIAL_CASES = [
  {
    path: pathToRegexp('/api/user'),
    GET: [{name: 'admin'}],
  },
  {
    path: pathToRegexp('/api/user/:user'),
    DELETE: [{name: 'admin'}],
  },
  {
    path: pathToRegexp('/api/reports'),
    POST: ['*'],
  },
  {
    path: pathToRegexp('/api/template'),
    POST: [{name: 'admin'}],
  },
  {
    path: pathToRegexp('/api/template/:template'),
    PUT: [{name: 'admin'}],
    DELETE: [{name: 'admin'}],
  },
  {
    path: pathToRegexp('/api/project'),
    POST: [{name: 'admin'}],
  },
  {
    path: pathToRegexp('/api/project/:project'),
    PUT: [{name: 'admin'}],
    DELETE: [{name: 'admin'}],
  },
  {
    path: pathToRegexp('/api/project/:project/user'),
    GET: [{name: 'admin'}, {name: 'manager'}],
  },
  {
    path: pathToRegexp('/api/project/:project/reports'),
    GET: [{name: 'admin'}, {name: 'manager'}],
  },
];


const UPDATE_METHODS = ['POST', 'PUT', 'DELETE'];
const MASTER_ACCESS = ['admin', 'manager'];

const hasMasterAccess = (user) => {
  return user.groups.some((group) => {
    return MASTER_ACCESS.includes(group.name.toLowerCase());
  });
};

const projectAccess = (user, report) => {
  if (hasMasterAccess(user)) {
    return true;
  }
  return isIntersectionBy(user.projects, report.projects, 'ident');
};

module.exports = async (req, res, next) => {
  // Check if user is an admin
  if (isAdmin(req.user)) {
    return next();
  }

  // Get route
  const [route] = req.originalUrl.split('?');

  if (req.report) {
    // check if user is bound to report
    const boundUser = req.report.users.some((reportUser) => {
      return reportUser.user.ident === req.user.ident;
    });

    // If the user doesn't have access to the project this report
    // belongs to or the user is trying to make an update
    // and they don't have update permissions throw an error
    if (!projectAccess(req.user, req.report)
      || (UPDATE_METHODS.includes(req.method) && !(boundUser || hasMasterAccess(req.user)))
    ) {
      logger.error(`User: ${req.user.username} is trying to make a ${req.method} request to ${req.originalUrl}`);
      return res.status(FORBIDDEN).json({
        error: {message: 'You do not have the correct permissions to access this'},
      });
    }
  } else {
    // See if route exists in special cases
    const spCase = SPECIAL_CASES.find((value) => {
      return route.match(value.path);
    });

    // Check that route and method have special rules
    if (spCase && spCase[req.method]) {
      if (spCase[req.method].includes('*')
        || isIntersectionBy(req.user.groups, spCase[req.method], 'name')
      ) {
        return next();
      }

      logger.error(`User: ${req.user.username} is trying to make a ${req.method} request to ${req.originalUrl}`);
      return res.status(FORBIDDEN).json({
        error: {message: 'You do not have the correct permissions to access this'},
      });
    }

    if ((UPDATE_METHODS.includes(req.method) && !hasMasterAccess(req.user))) {
      logger.error(`User: ${req.user.username} is trying to make a ${req.method} request to ${req.originalUrl}`);
      return res.status(FORBIDDEN).json({
        error: {message: 'You do not have the correct permissions to access this'},
      });
    }
  }

  return next();
};
