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

const request = require('../../app/request');
const keycloak = require('../../app/api/keycloak');

const environmentKeys = [
  'IPR_DEPLOYMENT', 'IPR_KEYCLOAK_URI', 'KEYCLOAK_ADMIN_USERNAME', 'KEYCLOAK_ADMIN_PASSWORD',
];
const originalEnvironment = Object.fromEntries(environmentKeys.map((key) => {
  return [key, process.env[key]];
}));

beforeEach(() => {
  process.env.IPR_DEPLOYMENT = 'docker';
  process.env.IPR_KEYCLOAK_URI = 'http://localhost:8888/auth/realms/PORI/protocol/openid-connect/token';
  process.env.KEYCLOAK_ADMIN_USERNAME = 'admin';
  process.env.KEYCLOAK_ADMIN_PASSWORD = 'admin';
  request.mockReset();
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

test.each(['localhost', 'keycloak'])('detects Docker Keycloak at %s:8888', (host) => {
  process.env.IPR_KEYCLOAK_URI = `http://${host}:8888/auth/realms/PORI/protocol/openid-connect/token`;
  expect(keycloak.isDockerKeycloak()).toBe(true);
});

test('does not detect Docker Keycloak when the port or deployment does not match', () => {
  process.env.IPR_KEYCLOAK_URI = 'http://localhost:8889/auth/realms/PORI/protocol/openid-connect/token';
  expect(keycloak.isDockerKeycloak()).toBe(false);

  process.env.IPR_KEYCLOAK_URI = 'http://localhost:8888/auth/realms/PORI/protocol/openid-connect/token';
  process.env.IPR_DEPLOYMENT = 'local';
  expect(keycloak.isDockerKeycloak()).toBe(false);
});

test('does not detect Docker Keycloak for an invalid URL', () => {
  process.env.IPR_KEYCLOAK_URI = 'localhost:8888';
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
  expect(createRequest.throwOnHTTPError).toBe(true);
  expect(JSON.parse(createRequest.body).credentials).toEqual([
    {type: 'password', value: 'PORI-temporary-password', temporary: true},
  ]);
});

test('requires admin credentials and flags token requests for HTTP error handling', async () => {
  request.mockResolvedValueOnce({access_token: 'admin-token'});
  await keycloak.getAdminToken();
  expect(request.mock.calls[0][0].throwOnHTTPError).toBe(true);

  delete process.env.KEYCLOAK_ADMIN_PASSWORD;
  await expect(keycloak.getAdminToken()).rejects.toThrow('admin credentials must be configured');
});

test('uses the same configured Keycloak token URL for user authentication', async () => {
  request.mockResolvedValueOnce({access_token: 'user-token'});
  await keycloak.getToken('someone', 'user-password');
  expect(request.mock.calls[0][0].url).toBe(process.env.IPR_KEYCLOAK_URI);
});
