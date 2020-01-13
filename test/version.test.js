process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const getPort = require('get-port');

chai.should();

chai.use(chaiHttp);
chai.use(require('chai-things'));

// get test user info
const CONFIG = require('../app/config');
const {listen} = require('../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

let server;
// Start API
before(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
});

// Tests API version endpoint
describe('Tests API version endpoint', () => {
  // Test API version
  it('Test API version', async () => {
    // get API version
    const res = await chai.request(server)
      .get('/api/1.0/version')
      .auth(username, password)
      .type('json');

    const expectedVersion = `v${process.env.npm_package_version || 1.0}`;

    res.should.have.status(200);
    res.body.should.be.a('object');
    res.body.apiVersion.should.equal(expectedVersion);
  });
});


after(async () => {
  await server.close();
});
