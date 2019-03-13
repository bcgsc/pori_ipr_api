// server.js

// BASE SETUP
// =========================================================================

// API Version
const API_VERSION = '1.0';

// Call packages required
const express = require('express'); // Call express
const socketIO = require('socket.io'); // Ready the socket server
const bodyParser = require('body-parser'); // Body parsing lib
const fs = require('fs'); // File System access
const cors = require('cors'); // CORS support
const morgan = require('morgan'); // Logging
const jwt = require('jsonwebtoken');
const {exec} = require('child_process');
const fileUpload = require('express-fileupload'); // File upload support
const Routing = require('./app/routes');
const logger = require('./lib/log'); // Load logging library

const app = express(); // define app using express
process.logger = logger;

module.exports = async () => {
  // Setup and store Socket IO in app
  app.io = socketIO();

  app.use(bodyParser.json());
  app.use(cors());
  app.use(fileUpload());
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Expose-Headers', 'X-token, X-Requested-With ,Origin, Content-Type, Accept');
    next();
  });

  // Suppress Console messages when testing...
  if (process.env.NODE_ENV !== 'test') {
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

  // Utility and Teapot
  app.get('/heart', (req, res) => { 
    return res.json({beat: (new Date()).getTime()});
  });
  app.get('/teapot', (req, res) => {
    return res.status(418).set({hi: 'mom!'}).send(fs.readFileSync('./lib/teapot.txt'));
  });

  // DEPENDENCIES CHECK ------------------------------------------------------
  const check = exec('convert');

  // Done executing
  check.on('close', (resp) => {
    if (resp !== 0) {
      logger.warn('ImageMagick is not installed. Reports will fail to load as a result.');
    }
  });

  // ROUTING  ----------------------------------------------------------------
  // All API routes will be prefixed with /api/x.x

  const routing = new Routing(app.io);
  try {
    await routing.init();

    // Expose routing
    app.use(`/api/${API_VERSION}`, routing.getRouter());
    logger.info('Routing Started!');

    return app;
  } catch (error) {
    logger.error(`Unable to initialize routing ${error}`);
    return process.exit();
  }
};
