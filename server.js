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
let express	= require('express'),		// Call express
    app		= express(),			// define app using express
    bodyParser  = require('body-parser'),	// Body parsing lib
    colors = require('colors'),
    sequelize = require('sequelize'),
    parse = require('csv-parse'),
    fs = require('fs'),
    models = require('./app/models'),
    nconf = require('nconf').argv().env().file({file: './config/config.json'}),
    cors = require('cors'),
    morgan = require('morgan');

app.use(bodyParser.json());
app.use(cors());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Expose-Headers", "X-token, X-Requested-With ,Origin, Content-Type, Accept");
  next();
});


// Suppress Console messages when testing...
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {stream: null}));
}

// Start Server
console.log(('  BCGSC - IPR-API Server '+ API_VERSION +'  ').blue.bold.bgWhite);
console.log("=".repeat(50).dim);
console.log(("Node Version: " + process.version).yellow);
console.log(('Running Environment: '+ process.env.NODE_ENV).green, '\n');

// Create router instance
let router = express.Router();

// Create test route for checking API health
router.get('/', (req, res) => {
  res.json({heart: 'beat'});
});


// ROUTING  ----------------------------------------------------------------
// All API routes will be prefixed with /api/x.x
app.use((req,res,next) => {
  require('./app/libs/logger').route(req.url);
  next();
});
app.use('/api/' + API_VERSION, require('./app/routes/index'));


// START THE SERVER
// =========================================================================
try {
  app.listen(CONFIG.web.port);
}
catch(error) {
  console.log('Unable to start server', error);
  process.exit();
}
console.log(('API Ready for requests on port:').yellow, CONFIG.web.port);

module.exports = app;
