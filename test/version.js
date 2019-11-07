process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');

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
  server = await listen(); // eslint-disable-line
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
