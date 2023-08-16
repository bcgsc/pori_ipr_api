process.env.NODE_ENV = 'test';

const getPort = require('get-port');
const supertest = require('supertest');

// get test user info
const CONFIG = require('../app/config');
const {listen} = require('../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

let server;
let request;

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

// Tests API version endpoint
describe('Tests API version endpoint', () => {
  // Test API version
  test('API version', async () => {
    // get API version
    const res = await request
      .get('/api/version')
      .auth(username, password)
      .type('json')
      .expect(200);

    const expectedVersion = `v${process.env.npm_package_version || '1.0'}`;

    expect(typeof (res)).toBe('object');
    expect(res.body.apiVersion).toEqual(expectedVersion);
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
