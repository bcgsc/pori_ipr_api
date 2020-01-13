process.env.NODE_ENV = 'test';

const getPort = require('get-port');
const request = require('supertest');

// get test user info
const CONFIG = require('../app/config');
const {listen} = require('../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

let server;
// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
});

// Tests API version endpoint
describe('Tests API version endpoint', () => {
  // Test API version
  test('Test API version', async () => {
    // get API version
    const res = await request(server)
      .get('/api/1.0/version')
      .auth(username, password)
      .type('json');

    const expectedVersion = `v${process.env.npm_package_version || 1.0}`;

    expect(res.status).toBe(200);
    expect(typeof (res)).toBe('object');
    expect(res.body.apiVersion).toBe(expectedVersion);
  });
});

afterAll(async () => {
  await server.close();
});
