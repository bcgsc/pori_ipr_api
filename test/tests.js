"use strict";
// Set Env
process.env.NODE_ENV = 'local';

// Dependencies
const assert      = require('assert');
const http        = require('http');
const colors      = require('colors');        // Console colours

const port        = '8081'; // Data Access
const admin_port  = '8082'; // Admin Functions
const API_VERSION = '1.0';


// Start Server
console.log(('  BCGSC - IPR-API Server '+ API_VERSION +' | Testing ').blue.bold.bgWhite);
console.log("=".repeat(50).dim);
console.log(("Node Version: " + process.version).yellow);
console.log(('Running Environment: '+ process.env.NODE_ENV).green, '\n');
console.log(('Application API Port: ').green,  port.toString().white);
console.log(('Admin API Port: ').green, admin_port.toString().white, '\n');

describe('IPR API', () => {
  let server;
  let admin_server;
  let io;
  
  // Start API servers before running tests
  before(function(done) {
    this.timeout(30000);

    let App = require('../app').then((app) => {

      let admin = require('../admin');

      app.set('port', port);
      admin.set('port', admin_port);


      // Create HTTP server.
      server = http.createServer(app);
      admin_server = http.createServer(admin);

      // Socket.io
      io     = app.io;
      io.attach(server);

      // Listen on provided port, on all network interfaces.
      server.listen(port);
      admin_server.listen(admin_port);

      console.log('Server listening');

      done();
    });
  });

  // Close API server connections after running tests
  after(function() {
    // Close server connections
    server.close();
    admin_server.close();
  });
  
  // Session Tests
  require('./session/session');
  
  // Utilities
  require('./utilities/pyToSql');
  require('./utilities/remapKeys');

  // Reports Tests
  //require('./reports/reports');

  // Tracking Tests
  require('./tracking/state');
  
});