const getPort = require('get-port');
const supertest = require('supertest');
const HTTP_STATUS = require('http-status-codes');

const db = require('../../../app/models');
// get test user info
const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

const UPDATE_SETTINGS = {
  faster: true,
  fancier: true,
  colour: 'black',
};

let server;
let request;

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

// Tests for user related endpoints
describe('/user/settings', () => {
  let testUser;

  beforeAll(async () => {
    // get test user
    testUser = await db.models.user.findOne({
      where: {username},
    });
  });

  describe('GET', () => {
    // Test for GET /user 200 endpoint
    test('/ - 200 Success', async () => {
      const res = await request
        .get('/api/user/settings')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(typeof res.body).toBe('object');
      expect(res.body).toHaveProperty('settings');
      expect(typeof res.body.settings).toBe('object');
    });
  });

  describe('PUT', () => {
    test('/ - 200 Successful update', async () => {
      const res = await request
        .put('/api/user/settings')
        .send(UPDATE_SETTINGS)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(expect.objectContaining(UPDATE_SETTINGS));

      // Expect that a new record wasn't created
      const results = await db.models.userMetadata.findAll({
        where: {userId: testUser.id}, paranoid: false,
      });
      expect(results.length).toBe(1);
    });
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
