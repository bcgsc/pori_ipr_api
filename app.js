"use strict";
// server.js

// BASE SETUP
// =========================================================================


// API Version
const API_VERSION = '1.0';
let minimist = require('minimist');


// Set environment based on config first.
if(process.env.NODE_ENV === undefined || process.env.NODE_ENV === null) {
  // Get from command line args
  const args = minimist(process.argv.slice(2));
  if(args.env) process.env.NODE_ENV = args.env;
  if(!args.env) process.env.NODE_ENV = 'production';
}
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

// Setup and store Socket IO in app
let io          = socket_io();
app.io          = io;

app.use(bodyParser.json());
app.use(cors());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Expose-Headers", "X-token, X-Requested-With ,Origin, Content-Type, Accept");
  next();
});

// Suppress Console messages when testing...
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(':method :url :status [:req[Authorization]] :res[content-length] - :response-time ms', {stream: null}));
}

// Start Server
console.log(('  BCGSC - IPR-API Server '+ API_VERSION +'  ').blue.bold.bgWhite);
console.log("=".repeat(50).dim);
console.log(("Node Version: " + process.version).yellow);
console.log(('Running Environment: '+ process.env.NODE_ENV).green, '\n');

// Create router instance
let router = express.Router();

// Utility and Teapot
app.get('/heart', (req,res,next)=> { res.json({beat: (new Date).getTime()}); });
app.get('/teapot', (req,res,next) => { res.status(418).set({'hi':'mom!'}).send(fs.readFileSync('./lib/teapot.txt')); });

// ROUTING  ----------------------------------------------------------------
// All API routes will be prefixed with /api/x.x

let routing = require(__dirname + '/app/routes');
let Routing = new routing(app.io);

app.use('/api/' + API_VERSION, Routing.getRouter());

module.exports = app;
