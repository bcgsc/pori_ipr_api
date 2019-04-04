"use strict";
// server.js

// BASE SETUP
// =========================================================================


// API Version
const API_VERSION = '1.0';
let minimist = require('minimist');

const CONFIG = require('./config/'+process.env.NODE_ENV+'.json');

// Call packages required
let express	    = require('express');		    // Call express
let app         = express();			          // define app using express
let socket_io   = require("socket.io");     // Ready the socket server
let bodyParser  = require('body-parser');   // Body parsing lib
let colors      = require('colors');        // Console colours
let fs          = require('fs');            // File System access
let nconf       = require('nconf').argv().env().file({file: './config/config.json'});
let cors        = require('cors');          // CORS support
let morgan      = require('morgan');        // Logging
let jwt         = require('jsonwebtoken');
let exec        = require('child_process').exec;
let fileUplooad = require('express-fileupload'); // File upload support


const logger        = require('./lib/log');       // Load logging library

process.logger = logger;

module.exports = new Promise((resolve, reject) => {
  
  // Setup and store Socket IO in app
  let io          = socket_io();
  app.io          = io;
  
  app.use(bodyParser.json());
  app.use(cors());
  app.use(fileUplooad());
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Expose-Headers", "X-token, X-Requested-With ,Origin, Content-Type, Accept");
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

  // Create router instance
  let router = express.Router();
  
  // Utility and Teapot
  app.get('/heart', (req,res,next)=> { res.json({beat: (new Date).getTime()}); });
  app.get('/teapot', (req,res,next) => { res.status(418).set({'hi':'mom!'}).send(fs.readFileSync('./lib/teapot.txt')); });
  
  // DEPENDENCIES CHECK ------------------------------------------------------
  let check = exec('convert');
  
  // Done executing
  check.on('close', (resp) => {
    if(resp !== 0) logger.warn('ImageMagick is not installed. Reports will fail to load as a result.');
  });
  
  // ROUTING  ----------------------------------------------------------------
  // All API routes will be prefixed with /api/x.x
  
  let Routing = require(__dirname + '/app/routes');
  let routing = new Routing(app.io);
  
  routing.init().then(
    (result) => {
      
      // Expose routing
      app.use('/api/' + API_VERSION, routing.getRouter());
      logger.info('Routing Started!');
      
      resolve(app);
    })
    .catch((err) => {
      console.log('Unable to initialize routing.', err);
      process.exit();
    });
  
});