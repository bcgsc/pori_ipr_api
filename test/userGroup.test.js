process.env.NODE_ENV = 'test';

const getPort = require('get-port');
const supertest = require('supertest');
const HTTP_STATUS = require('http-status-codes');

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

// Tests for user related endpoints
describe('', () => {

});

afterAll(async () => {
  await server.close();
});
