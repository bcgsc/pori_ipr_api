process.env.NODE_ENV = 'test';

const supertest = require('supertest');
const getPort = require('get-port');

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

describe('', () => {
  test('', async () => {

  });
});

afterAll(async () => {
  await server.close();
});
