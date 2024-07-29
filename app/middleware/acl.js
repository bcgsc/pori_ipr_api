const {FORBIDDEN} = require('http-status-codes');
const {pathToRegexp} = require('path-to-regexp');
const {
  isAdmin, isManager, isIntersectionBy, hasAccess, hasManagerAccess, projectAccess, hasAccessToGermlineReports,
} = require('../libs/helperFunctions');
const {MASTER_REPORT_ACCESS, UPDATE_METHODS} = require('../constants');
const db = require('../models');
const logger = require('../log');

const SPECIAL_CASES = [
  {
    path: pathToRegexp('/api/user'),
    GET: [{name: 'admin'}, {name: 'manager'}, {name: 'report assignment access'}],
    POST: [{name: 'admin'}, {name: 'manager'}],
  },
  {
    path: pathToRegexp('/api/user/me'),
    GET: ['*'],
  },
  {
    path: pathToRegexp('/api/user/:user/notifications'),
    PUT: ['*'],
  },
  {
    path: pathToRegexp('/api/variant-text'),
    POST: [{name: 'admin'}, {name: 'manager'}, {name: 'variant-text edit access'}],
  },
  {
    path: pathToRegexp('/api/variant-text/:variantText'),
    PUT: [{name: 'admin'}, {name: 'manager'}, {name: 'variant-text edit access'}],
    DELETE: [{name: 'admin'}, {name: 'manager'}, {name: 'variant-text edit access'}],
  },
  {
    path: pathToRegexp('/api/user/:user'),
    GET: [{name: 'admin'}, {name: 'manager'}, {name: 'report assignment access'}],
    DELETE: [{name: 'admin'}, {name: 'manager'}],
  },
  {
    path: pathToRegexp('/api/user/group/:group/member'),
    GET: [{name: 'admin'}, {name: 'manager'}],
    POST: [{name: 'admin'}, {name: 'manager'}],
    DELETE: [{name: 'admin'}, {name: 'manager'}],
  },
  {
    path: pathToRegexp('/api/reports'),
    POST: [{name: 'admin'}, {name: 'manager'}, {name: 'create report access'}],
  },
  {
    path: pathToRegexp('/api/reports/:report/user'),
    POST: [{name: 'admin'}, {name: 'manager'}, {name: 'report assignment access'}],
  },
  {
    path: pathToRegexp('/api/reports/:report/user/:reportUser'),
    DELETE: [{name: 'admin'}, {name: 'manager'}, {name: 'report assignment access'}],
  },
  {
    path: pathToRegexp('/api/reports-async'),
    POST: [{name: 'admin'}, {name: 'manager'}, {name: 'create report access'}],
  },
  {
    path: pathToRegexp('/api/germline-small-mutation-reports'),
    POST: [{name: 'admin'}, {name: 'manager'}, {name: 'create report access'}],
  },
  {
    path: pathToRegexp('/api/templates'),
    POST: [{name: 'admin'}, {name: 'manager'}, {name: 'template edit access'}],
  },
  {
    path: pathToRegexp('/api/templates/:template'),
    PUT: [{name: 'admin'}, {name: 'manager'}, {name: 'template edit access'}],
    DELETE: [{name: 'admin'}, {name: 'manager'}, {name: 'template edit access'}],
  },
  {
    path: pathToRegexp('/api/template/:template'),
    PUT: [{name: 'admin'}, {name: 'manager'}, {name: 'template edit access'}],
    DELETE: [{name: 'admin'}, {name: 'manager'}, {name: 'template edit access'}],
  },
  {
    path: pathToRegexp('/api/appendix'),
    POST: [{name: 'admin'}, {name: 'manager'}, {name: 'appendix edit access'}],
    PUT: [{name: 'admin'}, {name: 'manager'}, {name: 'appendix edit access'}],
    DELETE: [{name: 'admin'}, {name: 'manager'}, {name: 'appendix edit access'}],
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
    POST: [{name: 'admin'}, {name: 'manager'}],
    DELETE: [{name: 'admin'}, {name: 'manager'}],
  },
  {
    path: pathToRegexp('/api/project/:project/reports'),
    GET: [{name: 'admin'}, {name: 'manager'}],
    POST: [{name: 'admin'}],
    DELETE: [{name: 'admin'}, {name: 'manager'}],
  },
];

module.exports = async (req, res, next) => {
  // Update last time the user logged in, limit to once a day
  const currentDate = new Date().toDateString();
  let userMetadata = await db.models.userMetadata.findOrCreate({where: {userId: req.user.id}});
  userMetadata = userMetadata[0];
  const userLastLogin = userMetadata.lastLoginAt
    ? new Date(userMetadata.lastLoginAt).toDateString()
    : '';
  if (userLastLogin !== currentDate) {
    await userMetadata.update({lastLoginAt: new Date()});
  }

  try {
    if (req.query.clinician_view && hasManagerAccess(req.user)) {
      req.user.groups = [{name: 'Clinician'}];
    }
  } catch {
    logger.error('Clinician View error: Using users normal group');
  }

  // Check if user is an admin
  if (isAdmin(req.user)) {
    return next();
  }

  // Get route
  const [route] = req.originalUrl.split('?');

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
      error: {message: 'You do not have the correct permissions to access this 1'},
    });
  }

  if (!hasAccessToGermlineReports(req.user) && !isManager(req.user) && route.includes('/germline-small-mutation-reports')) {
    logger.error('User does not have germline access');
    return res.status(
      FORBIDDEN,
    ).json({error: {message: 'User does not have access to Germline reports'}});
  }

  if (req.report) {
    // check if user is bound to report depending on report type
    let boundUser;
    try {
      if (req.report.biofxAssigned) {
        boundUser = req.report.biofxAssigned.ident === req.user.ident;
      } else {
        boundUser = req.report.users.some((reportUser) => {
          return reportUser.user.ident === req.user.ident;
        }) || req.report.createdBy?.ident === req.user.ident;
      }
    } catch {
      logger.error('Error while retrieving bound user');
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
        error: {message: 'You do not have the correct permissions to access this 2'},
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

    return next();
  }

  // Allow users to edit themselves for allowNotifications field
  if ((UPDATE_METHODS.includes(req.method) && !hasManagerAccess(req.user)) && !req.originalUrl.includes('/api/user')) {
    logger.error(`User: ${req.user.username} is trying to make a ${req.method} request to ${req.originalUrl}`);
    return res.status(FORBIDDEN).json({
      error: {message: 'You do not have the correct permissions to access this 3'},
    });
  }

  return next();
};
