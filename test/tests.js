// Set Env
process.env.NODE_ENV = 'local';

// Dependencies
const http = require('http');
require('colors'); // Console colours

const port = '8081'; // Data Access
const API_VERSION = '1.0';


// Start Server
console.log((`BCGSC - IPR-API Server ${API_VERSION} | Testing`).blue.bold.bgWhite);
console.log('='.repeat(50).dim);
console.log((`Node Version: ${process.version}`).yellow);
console.log((`Running Environment: ${process.env.NODE_ENV}`).green, '\n');
console.log(('Application API Port: ').green, port.toString().white);

const App = require('../app');

describe.skip('IPR API', () => {
    let server;

    // Start API servers before running tests
    before(function (done) {
        this.timeout(30000);


        App.then((app) => {
            app.set('port', port);

            // Create HTTP server.
            server = http.createServer(app);

            // Listen on provided port, on all network interfaces.
            server.listen(port);

            console.log('Server listening');

            done();
        });
    });

    // Close API server connections after running tests
    after(() => {
    // Close server connections
        server.close();
    });

    // Utilities
    require('./utilities/pyToSql');
    require('./utilities/remapKeys');
    require('./libs/tableFilter.spec');

    // Reports Tests
    // require('./reports/reports');
});
