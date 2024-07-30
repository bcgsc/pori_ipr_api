const {FORBIDDEN} = require('http-status-codes');
const db = require('../../app/models');
const Acl = require('../../app/middleware/acl');
const CONFIG = require('../../app/config');

CONFIG.set('env', 'test');
const {username} = CONFIG.get('testing');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Testing ACL methods', () => {
  let testUser;
  let req = {};

  beforeAll(async () => {
    // get test user
    testUser = await db.models.user.findOne({
      where: {username},
    });
  });

  describe('Test ACL general methods', () => {
    let res;

    beforeEach(async () => {
      res = mockResponse();
      req.user = testUser;
    });

    afterEach(async () => {
      res = null;
      req = {};
    });

    test('Admins have full access', async () => {
      req.user.groups = [{name: 'Admin'}];
      req.originalUrl = '/api/project/dfgfdgddsf';
      req.method = 'DELETE';

      await Acl(req, res, () => {});

      expect(res.status).not.toHaveBeenCalledWith(FORBIDDEN);
    });

    test('Query parameters work', async () => {
      req.user.groups = [{name: 'hello'}];
      req.originalUrl = '/api/user?par=true';
      req.method = 'GET';

      await Acl(req, res, () => {});

      expect(res.status).toHaveBeenCalledWith(FORBIDDEN);
    });
  });

  describe('Test ACL report routes', () => {
    let res;

    beforeEach(async () => {
      res = mockResponse();
      req.user = testUser;
      req.report = {};
    });

    afterEach(async () => {
      res = null;
      req = {};
    });

    test('GET request when user has master access', async () => {
      req.user.groups = [{name: 'admin'}];
      req.user.projects = [];

      req.report.projects = [];
      req.report.users = [];

      req.originalUrl = '/api/reports/sdfsfs';
      req.method = 'GET';

      await Acl(req, res, () => {});

      expect(res.status).not.toHaveBeenCalledWith(FORBIDDEN);
    });

    test('GET request when user has project access', async () => {
      req.user.projects = [{ident: 'matching-test-ident'}];

      req.report.projects = [{ident: 'matching-test-ident'}];
      req.report.users = [];

      req.originalUrl = '/api/reports/sdfsfs';
      req.method = 'GET';

      await Acl(req, res, () => {});

      expect(res.status).not.toHaveBeenCalledWith(FORBIDDEN);
    });

    test('GET request when user does not have project access', async () => {
      req.user.groups = [{name: 'hello'}];
      req.user.projects = [{ident: 'not-matching-test-ident'}];

      req.report.projects = [{ident: 'matching-test-ident'}];
      req.report.users = [];

      req.originalUrl = '/api/reports/sdfsfs';
      req.method = 'GET';

      await Acl(req, res, () => {});

      expect(res.status).toHaveBeenCalledWith(FORBIDDEN);
    });

    test('Update request when user has master access', async () => {
      req.user.groups = [{name: 'manager'}];
      req.user.projects = [{ident: 'matching-test-ident'}];

      req.report.projects = [{ident: 'matching-test-ident'}];
      req.report.users = [{user: {ident: 'random-ident'}}];

      req.originalUrl = '/api/reports/sdfsfs';
      req.method = 'PUT';

      await Acl(req, res, () => {});

      expect(res.status).not.toHaveBeenCalledWith(FORBIDDEN);
    });

    test('Update request when user is bound to report', async () => {
      req.user.projects = [{ident: 'matching-test-ident'}];

      req.report.projects = [{ident: 'matching-test-ident'}];
      req.report.users = [{user: {ident: req.user.ident}}];

      req.originalUrl = '/api/reports/sdfsfs';
      req.method = 'PUT';

      await Acl(req, res, () => {});

      expect(res.status).not.toHaveBeenCalledWith(FORBIDDEN);
    });

    test('Update request when user is not bound to the report and does not have master access', async () => {
      req.user.groups = [{name: 'hello'}];
      req.user.projects = [{ident: 'matching-test-ident'}];

      req.report.projects = [{ident: 'matching-test-ident'}];
      req.report.users = [{user: {ident: 'random-ident'}}];

      req.originalUrl = '/api/reports/sdfsfs';
      req.method = 'PUT';

      await Acl(req, res, () => {});

      expect(res.status).toHaveBeenCalledWith(FORBIDDEN);
    });
  });

  describe('Test ACL non-report routes', () => {
    let res;

    beforeEach(async () => {
      res = mockResponse();
      req.user = testUser;
    });

    afterEach(async () => {
      res = null;
      req = {};
    });

    test('Update request when user has master access', async () => {
      req.user.groups = [{name: 'manager'}];
      req.originalUrl = '/api/project/fdgfdgfd/user';
      req.method = 'POST';

      await Acl(req, res, () => {});

      expect(res.status).not.toHaveBeenCalledWith(FORBIDDEN);
    });

    test('Update request when user does not have master access', async () => {
      req.user.groups = [{name: 'hello'}];
      req.originalUrl = '/api/project/fdgfdgfd/user';
      req.method = 'POST';

      await Acl(req, res, () => {});

      expect(res.status).toHaveBeenCalledWith(FORBIDDEN);
    });

    test('GET request that is not a special case', async () => {
      req.originalUrl = '/api/template';
      req.method = 'GET';

      await Acl(req, res, () => {});

      expect(res.status).not.toHaveBeenCalledWith(FORBIDDEN);
    });

    test('Special case (matching route and method) where the user is allowed to edit', async () => {
      req.user.groups = [{name: 'create report access'}];
      req.originalUrl = '/api/reports';
      req.method = 'POST';

      await Acl(req, res, () => {});

      expect(res.status).not.toHaveBeenCalledWith(FORBIDDEN);
    });

    test('Special case (matching route and method) where the user is not allowed to edit', async () => {
      req.originalUrl = '/api/template/fsddfds';
      req.method = 'PUT';

      await Acl(req, res, () => {});

      expect(res.status).toHaveBeenCalledWith(FORBIDDEN);
    });
  });
});
