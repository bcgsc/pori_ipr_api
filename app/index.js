/**
 * Module dependencies.
 */
const http = require('http');
const express = require('express'); // Call express
const bodyParser = require('body-parser'); // Body parsing lib
const cors = require('cors'); // CORS support
const morgan = require('morgan'); // Logging
const jwt = require('jsonwebtoken');
const {exec} = require('child_process');
const fileUpload = require('express-fileupload'); // File upload support

require('colors'); // Console colours

const conf = require('../app/config');
const sequelize = require('./models');
const Routing = require('./routes');
const logger = require('./log'); // Load logging library

/**
 * This is a hack to fetch all routes from an express
 * router with nested sub-routers
 *
 * It uses the regex pattern added to the sub-router and
 * tries to normalize it into something more human readable
 * since this doesn't appear to be store elsewhere
 */
const replaceParams = (string) => {
  let curr = string;
  let last = '';
  let paramCount = 1;
  while (last !== curr) {
    last = curr.slice();
    // this is the pattern that express uses when you define your path param without a custom regex
    curr = curr.replace('(?:([^\\/]+?))', `:param${paramCount++}`);
  }
  return curr;
};

/**
 * @param {express.Router} initialRouter the top level router
 * @returns {Array.<Object>} route definitions
 *
 * @example
 * > fetchRoutes(router)
 * [
 *      {path: '/some/express/route', methods: {get: true}}
 * ]
 */
const fetchRoutes = (initialRouter) => {
  const _fetchRoutes = (router, prefix = '') => {
    const routes = [];
    router.stack.forEach(({
      route, handle, name, ...rest
    }) => {
      if (route) { // routes registered directly on the app
        const path = replaceParams(`${prefix}${route.path}`).replace(/\\/g, '').replace(/\/$/, '');
        routes.push({path, methods: route.methods});
      } else if (name === 'router') {
        // router middleware
        const newPrefix = rest.regexp.source
          .replace('\\/?(?=\\/|$)', '') // this is the pattern express puts at the end of a route path
          .slice(1)
          .replace('\\', ''); // remove escaping to make paths more readable
        routes.push(..._fetchRoutes(handle, prefix + newPrefix));
      }
    });
    return routes;
  };
  return _fetchRoutes(initialRouter);
};


const listen = async (port = null) => {
  const app = express(); // define app using express
  logger.info(`starting http server on port ${port || conf.get('web:port')}`);
  const server = http.createServer(app).listen(port || conf.get('web:port'));
  app.use(bodyParser.json());
  app.use(cors());
  app.use(fileUpload());
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Expose-Headers', 'X-token, X-Requested-With ,Origin, Content-Type, Accept');
    return next();
  });

  // log http request information
  // ex. "GET /api/project 200 username 173.095 ms"
  if (logger.levels[logger.level] >= logger.levels.info) {
    app.use(morgan((tokens, req, res) => {
      const token = req.header('Authorization');
      let user;
      try {
        user = jwt.decode(token).preferred_username;
      } catch (err) {
        user = token;
      }
      return [
        tokens.method(req, res),
        tokens.url(req, res),
        tokens.status(req, res),
        tokens['remote-user'](req, res) || user,
        tokens['response-time'](req, res), 'ms',
      ].join(' ');
    }));
  }


  // DEPENDENCIES CHECK ------------------------------------------------------
  const check = exec('convert');

  // Done executing
  check.on('close', (resp) => {
    if (resp !== 0) {
      logger.warn('ImageMagick is not installed. Reports will fail to load as a result.');
    }
  });

  // ensure the db connection is ready
  await sequelize.authenticate();

  // set up the routing
  const routing = new Routing();
  try {
    await routing.init();

    // Expose routing
    app.use('/api', routing.getRouter());
    logger.info('Routing Started!');
  } catch (error) {
    logger.error(`Unable to initialize routing ${error}`);
    throw error;
  }

  app.close = async () => {
    return server.close();
  };

  logger.log('info', `started application server on port ${port || conf.get('web:port')}`);

  // list all the routes that are found from the express router
  const routes = fetchRoutes(routing.getRouter())
    .sort((r1, r2) => { return r1.path.localeCompare(r2.path); });

  for (const {methods, path} of routes) {
    logger.info(`Registered route: (${Object.keys(methods).sort().join('|')}) ${path}`);
  }
  return app;
};

module.exports = {listen};
