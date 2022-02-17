const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');
// get test user info
const CONFIG = require('../../app/config');
const {listen} = require('../../app');

// get credentials from the CONFIG
CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

const BASE_URL = '/api/graphkb';

const testAutocompleteWithKeyword = async (request, type, keyword) => {
  const {body} = await request
    .get(`${BASE_URL}/${type}?search=${keyword}`)
    .auth(username, password)
    .type('json')
    .expect(HTTP_STATUS.OK);

  expect(body).toEqual(
    expect.objectContaining({
      result: expect.arrayContaining([
        expect.objectContaining({
          // expect rid format to match graphkb pattern ex. #3:4
          '@rid': expect.stringMatching(/^#-?\d+:-?\d+$/),
          displayName: expect.anything(),
          '@class': expect.anything(),
        }),
      ]),
    }),
  );
  return body.result;
};

const testAutocompleteWithoutKeyword = async (request, type) => {
  const {body} = await request
    .get(`${BASE_URL}/${type}`)
    .auth(username, password)
    .type('json')
    .expect(HTTP_STATUS.OK);

  expect(body).toEqual(
    expect.objectContaining({
      result: expect.arrayContaining([
        expect.objectContaining({
          '@rid': expect.stringMatching(/^#-?\d+:-?\d+$/),
          displayName: expect.anything(),
          '@class': expect.anything(),
        }),
      ]),
    }),
  );
  return body.result;
};

describe('GET /graphkb/:targetType', () => {
  let server;
  let request;

  beforeAll(async () => {
    const port = await getPort({port: CONFIG.get('web:port')});
    server = await listen(port);
    request = supertest(server);
  });

  afterAll(async () => {
    await server.close();
  });

  describe('GET /variant', () => {
    test('with keyword', async () => {
      const result = await testAutocompleteWithKeyword(request, 'variant', 'kras');
      expect(result.length).toBeGreaterThan(0);
      const [first] = result;
      expect(first).toHaveProperty('displayName', expect.stringMatching(/.*kras.*/i));
    });

    test('without keyword', async () => {
      await testAutocompleteWithoutKeyword(request, 'variant');
    });
  });

  describe('GET /context', () => {
    test('with keyword', async () => {
      await testAutocompleteWithKeyword(request, 'context', 'kras');
    });

    test('without keyword', async () => {
      await testAutocompleteWithoutKeyword(request, 'context');
    });
  });

  describe('GET /evidenceLevel', () => {
    test.todo('with keyword'); // pending API Fix release in GraphKB API 3.3.0

    test('without keyword', async () => {
      await testAutocompleteWithoutKeyword(request, 'evidenceLevel');
    });
  });

  describe('GET /therapy', () => {
    test('with keyword', async () => {
      await testAutocompleteWithKeyword(request, 'therapy', 'kras');
    });

    test('without keyword', async () => {
      await testAutocompleteWithoutKeyword(request, 'therapy');
    });
  });
});

describe('GET /graphkb/evidence-levels', () => {
  let server;
  let request;

  beforeAll(async () => {
    const port = await getPort({port: CONFIG.get('web:port')});
    server = await listen(port);
    request = supertest(server);
  });

  afterAll(async () => {
    await server.close();
  });

  test('returns at least one evidence level and the description is included', async () => {
    const {body} = await request
      .get(`${BASE_URL}/evidence-levels`)
      .auth(username, password)
      .type('json')
      .expect(HTTP_STATUS.OK);

    expect(body.result.length).toBeGreaterThan(0);
    expect(body.result[0]).toHaveProperty('description');
  });
});
