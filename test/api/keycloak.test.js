jest.mock('../../app/request', () => {
  return jest.fn();
});
jest.mock('../../app/config', () => {
  return {
    get: jest.fn(() => {
      return {
        uri: 'http://localhost:8888/auth/realms/PORI/protocol/openid-connect/token',
        clientId: 'IPR',
      };
    }),
  };
});
jest.mock('../../app/log', () => {
  return {debug: jest.fn()};
});
jest.mock('generate-password', () => {
  return {generate: jest.fn()};
});

const generator = require('generate-password');
const request = require('../../app/request');
const keycloak = require('../../app/api/keycloak');

const environmentKeys = [
  'IPR_DEPLOYMENT', 'IPR_KEYCLOAK_URI', 'KEYCLOAK_ADMIN_USER', 'KEYCLOAK_ADMIN_PASS',
];
const originalEnvironment = Object.fromEntries(environmentKeys.map((key) => {
  return [key, process.env[key]];
}));

beforeEach(() => {
  process.env.IPR_DEPLOYMENT = 'docker';
  process.env.IPR_KEYCLOAK_URI = 'http://localhost:8888/auth/realms/PORI/protocol/openid-connect/token';
  process.env.KEYCLOAK_ADMIN_USER = 'admin';
  process.env.KEYCLOAK_ADMIN_PASS = 'admin';
  request.mockReset();
  generator.generate.mockReset().mockReturnValue('MockPass12!@');
});

afterAll(() => {
  for (const key of environmentKeys) {
    if (originalEnvironment[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnvironment[key];
    }
  }
});

test.each(['localhost:8888', 'keycloak:8080'])('detects Docker Keycloak at %s', (host) => {
  process.env.IPR_KEYCLOAK_URI = `http://${host}/auth/realms/PORI/protocol/openid-connect/token`;
  expect(keycloak.isDockerKeycloak()).toBe(true);
});

test('does not detect Docker Keycloak outside Docker even on port 8888', () => {
  process.env.IPR_DEPLOYMENT = 'local';
  expect(keycloak.isDockerKeycloak()).toBe(false);
});

test('creates users with a temporary password instead of their local password', async () => {
  request.mockResolvedValueOnce({access_token: 'admin-token'}).mockResolvedValueOnce(null);

  await keycloak.createUser({
    username: 'local-user',
    firstName: 'First',
    lastName: 'Last',
    email: 'user@example.com',
    password: 'local-password-must-not-be-shared',
  });

  const [, [createRequest]] = request.mock.calls;
  expect(request.mock.calls[0][0].timeout).toBe(10000);
  expect(createRequest.timeout).toBe(10000);
  expect(createRequest.throwOnHTTPError).toBe(true);
  expect(generator.generate).toHaveBeenCalledTimes(1);
  expect(generator.generate).toHaveBeenCalledWith({
    length: 12,
    numbers: true,
    symbols: true,
    uppercase: true,
    lowercase: true,
    strict: true,
  });
  expect(JSON.parse(createRequest.body).credentials).toEqual([
    {type: 'password', value: 'MockPass12!@', temporary: true},
  ]);
});

test('requires admin credentials and flags token requests for HTTP error handling', async () => {
  request.mockResolvedValueOnce({access_token: 'admin-token'});
  await keycloak.getAdminToken();
  expect(request.mock.calls[0][0].throwOnHTTPError).toBe(true);

  delete process.env.KEYCLOAK_ADMIN_PASS;
  await expect(keycloak.getAdminToken()).rejects.toThrow('admin credentials must be configured');
});

test.each(['admin token', 'user creation'])('propagates a timeout during %s', async (stage) => {
  const error = Object.assign(new Error('Request timed out'), {code: 'ETIMEDOUT'});
  if (stage === 'user creation') {
    request.mockResolvedValueOnce({access_token: 'admin-token'});
  }
  request.mockRejectedValueOnce(error);

  await expect(keycloak.createUser({username: 'someone'})).rejects.toBe(error);
  expect(request).toHaveBeenCalledTimes(stage === 'user creation' ? 2 : 1);
});

test.each(['createUser', 'updateUser', 'deleteUser'])('%s extracts the realm from the configured URL', async (method) => {
  process.env.IPR_KEYCLOAK_URI = 'http://localhost:8888/auth/realms/custom-realm/protocol/openid-connect/token';
  request.mockResolvedValueOnce({access_token: 'admin-token'})
    .mockResolvedValueOnce([{id: 'kc-user-id'}])
    .mockResolvedValueOnce(null);

  await keycloak[method](method === 'deleteUser' ? 'someone' : {username: 'someone'});

  expect(request.mock.calls[1][0].url).toMatch(
    /^http:\/\/localhost:8888\/auth\/admin\/realms\/custom-realm\/users(?:\?|$)/,
  );
});

test('rejects a configured URL without a realm', async () => {
  process.env.IPR_KEYCLOAK_URI = 'http://localhost:8888/auth';

  await expect(keycloak.createUser({username: 'someone'})).rejects.toThrow(
    'Keycloak URL must contain /auth/realms/<realm>/',
  );
  expect(request).not.toHaveBeenCalled();
});

test('updates the exact Keycloak user profile without changing credentials', async () => {
  request.mockResolvedValueOnce({access_token: 'admin-token'})
    .mockResolvedValueOnce([{
      id: 'kc/user-id',
      username: 'user+name',
      email: 'previous@example.com',
    }])
    .mockResolvedValueOnce(null);

  await expect(keycloak.updateUser({
    username: 'user+name',
    firstName: 'UpdatedFirst',
    lastName: 'UpdatedLast',
    email: 'updated@example.com',
    password: 'local-password-must-not-be-shared',
  })).resolves.toBeNull();

  expect(request).toHaveBeenCalledTimes(3);
  const usersUrl = 'http://localhost:8888/auth/admin/realms/PORI/users';
  expect(request).toHaveBeenNthCalledWith(2, {
    method: 'GET',
    url: `${usersUrl}?username=user%2Bname&exact=true`,
    json: true,
    throwOnHTTPError: true,
    headers: {Authorization: 'Bearer admin-token'},
  });
  expect(request).toHaveBeenNthCalledWith(3, {
    method: 'PUT',
    url: `${usersUrl}/kc%2Fuser-id`,
    json: true,
    throwOnHTTPError: true,
    body: JSON.stringify({
      emailVerified: false,
      firstName: 'UpdatedFirst',
      lastName: 'UpdatedLast',
      email: 'updated@example.com',
    }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer admin-token',
    },
  });
});

test('deletes the exact Keycloak user using its Keycloak ID', async () => {
  request.mockResolvedValueOnce({access_token: 'admin-token'})
    .mockResolvedValueOnce([{id: 'kc-user-id', username: 'user+name'}])
    .mockResolvedValueOnce(null);

  await keycloak.deleteUser('user+name');

  expect(request.mock.calls[1][0]).toEqual(expect.objectContaining({
    method: 'GET',
    url: expect.stringContaining('/users?username=user%2Bname&exact=true'),
    throwOnHTTPError: true,
    headers: {Authorization: 'Bearer admin-token'},
  }));
  expect(request.mock.calls[2][0]).toEqual(expect.objectContaining({
    method: 'DELETE',
    url: expect.stringContaining('/users/kc-user-id'),
    throwOnHTTPError: true,
    headers: {Authorization: 'Bearer admin-token'},
  }));
});

test('allows deletion when the user is already absent from Keycloak', async () => {
  request.mockResolvedValueOnce({access_token: 'admin-token'}).mockResolvedValueOnce([]);
  await expect(keycloak.deleteUser('missing-user')).resolves.toBeNull();
  expect(request).toHaveBeenCalledTimes(2);
});

test.each([null, {}, [{id: 'one'}, {id: 'two'}], [{}]])('rejects invalid lookup: %j', async (users) => {
  request.mockResolvedValueOnce({access_token: 'admin-token'}).mockResolvedValueOnce(users);
  await expect(keycloak.deleteUser('someone')).rejects.toThrow();
  expect(request).toHaveBeenCalledTimes(2);
});

test('propagates Keycloak deletion failures', async () => {
  request.mockResolvedValueOnce({access_token: 'admin-token'})
    .mockResolvedValueOnce([{id: 'kc-user-id'}])
    .mockRejectedValueOnce(new Error('Keycloak returned 500'));
  await expect(keycloak.deleteUser('someone')).rejects.toThrow('Keycloak returned 500');
});

test('uses the same configured Keycloak token URL for user authentication', async () => {
  request.mockResolvedValueOnce({access_token: 'user-token'});
  await keycloak.getToken('someone', 'user-password');
  expect(request.mock.calls[0][0].url).toBe(process.env.IPR_KEYCLOAK_URI);
});
