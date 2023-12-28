const {FORBIDDEN} = require('http-status-codes');
const {pathToRegexp} = require('path-to-regexp');
const {
  isAdmin, isIntersectionBy, hasAccess, hasMasterAccess, projectAccess, hasAccessToGermlineReports,
} = require('../libs/helperFunctions');
const {MASTER_REPORT_ACCESS, UPDATE_METHODS} = require('../constants');
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
    path: pathToRegexp('/api/germline-small-mutation-reports'),
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

module.exports = async (req, res, next) => {
  // Update last time the user logged in, limit to once a day
  const currentDate = new Date().toDateString();
  const userLastLogin = req.user.lastLoginAt
    ? new Date(req.user.lastLoginAt).toDateString()
    : '';

  if (userLastLogin !== currentDate) {
    await req.user.update({lastLoginAt: new Date()});
  }

  // Check if user is an admin
  if (isAdmin(req.user)) {
    return next();
  }

  // Get route
  const [route] = req.originalUrl.split('?');

  if (!hasAccessToGermlineReports(req.user) && route.includes('/germline-small-mutation-reports')) {
    logger.error('User does not have germline access');
    return res.status(
      FORBIDDEN,
    ).json({error: {message: 'User does not have access to Germline reports'}});
  }

  if (req.report) {
    // check if user is bound to report depending on report type
    let boundUser;
    if (req.report.biofxAssigned) {
      boundUser = req.report.biofxAssigned.ident === req.user.ident;
    } else {
      boundUser = req.report.users.some((reportUser) => {
        return reportUser.user.ident === req.user.ident;
      }) || req.report.createdBy?.ident === req.user.ident;
    }

    // If the user doesn't have access to the project this report
    // belongs to or the user is trying to make an update
    // and they don't have update permissions throw an error
    if (!projectAccess(req.user, req.report)
      || (UPDATE_METHODS.includes(req.method)
      && !(boundUser || hasAccess(req.user, MASTER_REPORT_ACCESS)))
    ) {
      logger.error(`User: ${req.user.username} is trying to make a ${req.method} request to ${req.originalUrl}`);
      return res.status(FORBIDDEN).json({
        error: {message: 'You do not have the correct permissions to access this'},
      });
    }

    // If user is trying to make an update and the report is completed
    // and they dont have update permissions, throw an error
    if (UPDATE_METHODS.includes(req.method)
      && req.report.state === 'completed'
      && !(hasAccess(req.user, MASTER_REPORT_ACCESS))
    ) {
      logger.error(`User: ${req.user.username} is trying to make a ${req.method} request to ${req.originalUrl} - Report is marked as complete`);
      return res.status(FORBIDDEN).json({
        error: {message: 'Report is marked as completed and update has been restricted'},
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
