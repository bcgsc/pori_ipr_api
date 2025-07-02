/**
 * Module dependencies.
 */
const http = require('http');
const express = require('express'); // Call express
const compression = require('compression'); // Compression middleware
const boolParser = require('express-query-boolean'); // Converts strings with true/false to a boolean
const cors = require('cors'); // CORS support
const morgan = require('morgan'); // Logging
const jwt = require('jsonwebtoken');
const fileUpload = require('express-fileupload'); // File upload support
const {setupBullBoard} = require('./bull-board');
const {setupQueues} = require('./queue'); // exports { emailQueue, ... }

const conf = require('./config');
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
  port = process.env.PORT || conf.get('web:port');

  if (process.env.NODE_ENV === 'test') {
    port = 0;
  }
  logger.info(`starting http server on port ${port}`);
  const server = http.createServer(app).listen(port);
  // TODO: https://www.bcgsc.ca/jira/browse/DEVSU-985 reduce when images are a separate upload
  app.use(express.json({limit: '100mb'}));
  app.use(boolParser());
  app.use(compression());
  app.use(cors());
  // Set max image size to 50MB, max num of images to 20 and max fields + files to 50
  app.use(fileUpload({limits: {fileSize: 50 * 1024 * 1024, files: 20, parts: 50}}));
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
    .sort((r1, r2) => {
      return r1.path.localeCompare(r2.path);
    });

  for (const {methods, path} of routes) {
    logger.info(`Registered route: (${Object.keys(methods).sort().join('|')}) ${path}`);
  }

  // bull-mq setup
  const queues = setupQueues();
  setupBullBoard({app, queues});

  return app;
};

module.exports = {listen};
