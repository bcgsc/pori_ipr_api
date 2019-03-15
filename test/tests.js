// Set Env
process.env.NODE_ENV = 'local';

// Dependencies
const http = require('http');
require('colors'); // Console colours

const pyToSql = require('./utilities/pyToSql');
const remapKeys = require('./utilities/remapKeys');
const state = require('./tracking/state');

const port = '8081'; // Data Access
const API_VERSION = '1.0';
const {logger} = process;


// Start Server
logger.info((`BCGSC - IPR-API Server ${API_VERSION} | Testing`).blue.bold.bgWhite);
logger.info('='.repeat(50).dim);
logger.info((`Node Version: ${process.version}`).yellow);
logger.info((`Running Environment: ${process.env.NODE_ENV}`).green, '\n');
logger.info(('Application API Port: ').green, port.toString().white);

const App = require('../app');

describe('IPR API', () => {
  let server;

  // Start API servers before running tests
  before(async (done) => {
    this.timeout(30000);

    const app = await App();

    app.set('port', port);

    // Create HTTP server.
    server = http.createServer(app);

    // Socket.io
    const {io} = app;
    io.attach(server);

    // Listen on provided port, on all network interfaces.
    server.listen(port);

    logger.info('Server listening');

    done();
  });

  // Close API server connections after running tests
  after(() => {
    // Close server connections
    server.close();
  });

  // Utilities
  pyToSql;
  remapKeys;

  // Tracking Tests
  state;
});
