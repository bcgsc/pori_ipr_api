const http = require('http');
const request = require('../../app/request');

describe('request HTTP error handling', () => {
  let server;
  let url;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      res.writeHead(409, {'Content-Type': 'application/json'});
      res.end(req.url === '/empty' ? '' : JSON.stringify({error: 'User already exists'}));
    });
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    url = `http://127.0.0.1:${server.address().port}/users`;
  });

  afterAll(async () => {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  });

  test('rejects failed Keycloak requests when requested', async () => {
    await expect(request({url, json: true, throwOnHTTPError: true})).rejects.toThrow('status 409');
  });

  test('rejects failed Keycloak requests even when their response is empty', async () => {
    const emptyUrl = new URL('/empty', url).toString();
    await expect(request({url: emptyUrl, json: true, throwOnHTTPError: true}))
      .rejects.toThrow('status 409');
  });

  test('preserves existing error response behavior for other callers', async () => {
    await expect(request({url, json: true})).resolves.toEqual({error: 'User already exists'});
  });
});
