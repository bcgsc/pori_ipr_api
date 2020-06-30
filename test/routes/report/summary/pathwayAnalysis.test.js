const HTTP_STATUS = require('http-status-codes');

const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../../../../app/models');


const CONFIG = require('../../../../app/config');
const {listen} = require('../../../../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

const LONGER_TIMEOUT = 50000;

let server;
let request;


// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

// Tests for /kb-matches endpoint
describe('', () => {
  beforeAll(async () => {
  }, LONGER_TIMEOUT);

  describe('GET', () => {
    test('', async () => {
    });
  });

  // delete report
  afterAll(async () => {

  }, LONGER_TIMEOUT);
});

afterAll(async () => {
  await server.close();
});
