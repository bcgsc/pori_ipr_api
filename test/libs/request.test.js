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

  test('allows successful responses with a deadline', async () => {
    await expect(request({url, json: true, timeout: 1000}))
      .resolves.toEqual({error: 'User already exists'});
  });
});

describe('request deadlines', () => {
  let server;
  let url;
  let responseClosed;
  const sockets = new Set();

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      responseClosed = new Promise((resolve) => {
        res.on('close', resolve);
      });
      if (req.url === '/partial') {
        res.writeHead(200);
        res.write('incomplete response');
      }
      // Deliberately never finish the response.
    });
    server.on('connection', (socket) => {
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));
    });
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    url = `http://127.0.0.1:${server.address().port}`;
  });

  afterEach(() => {
    sockets.forEach((socket) => socket.destroy());
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test.each(['/silent', '/partial'])('aborts and rejects a stalled %s response', async (path) => {
    await expect(request({url: `${url}${path}`, timeout: 100}))
      .rejects.toMatchObject({code: 'ETIMEDOUT'});
    // The remote side observes disconnection, not merely a rejected local promise.
    await responseClosed;
  });
});
