const db = require('../../app/models');
const Acl = require('../../app/middleware/acl');
const CONFIG = require('../../app/config');

CONFIG.set('env', 'test');
const {username} = CONFIG.get('testing');


describe('Testing ACL methods', () => {
  let testUser;
  let req = {};

  beforeAll(async () => {
    // get test user
    testUser = await db.models.user.findOne({
      where: {username},
    });
  });

  describe('Test ACL getProjectAccess method', () => {
    test.todo('Test when user has full project access');

    test.todo('Test when user does not have full project access');
  });

  describe('Test ACL check method', () => {
    describe('Test groups in check method', () => {
      beforeEach(async () => {
        req.user = testUser;
      });

      afterEach(async () => {
        req = {};
      });

      test('Allowed and disallowed contains same group', async () => {
        req.user.groups = [{name: 'Clinician'}];

        const access = new Acl(req);
        access.groups = ['Clinician'];
        access.nGroups = ['Clinician'];

        expect(() => { access.check(); }).toThrow('Group(s) in both allowed and not allowed');
      });

      test('User doesn\'t belongs to an allowed group', async () => {
        req.user.groups = [{name: 'Bioinformatician'}];

        const access = new Acl(req);
        access.groups = ['Clinician'];

        expect(access.check()).toBe(false);
      });

      test('User belongs to a disallowed group', async () => {
        req.user.groups = [{name: 'Clinician'}];

        const access = new Acl(req);
        access.nGroups = ['Clinician'];

        expect(access.check()).toBe(false);
      });
    });

    describe('Test report endpoints in check method', () => {
      let report;

      beforeAll(() => {
        report = {users: [{user: testUser}]};
      });

      beforeEach(async () => {
        req.user = testUser;
      });

      afterEach(async () => {
        req = {};
      });

      test('Test valid report GET', async () => {
        req.method = 'GET';
        req.report = report;

        const access = new Acl(req);

        expect(access.check()).toBe(true);
      });

      test('Test valid report PUT/POST/DELETE with admin', async () => {
        req.method = 'PUT';
        req.user.groups = [{name: 'admin'}];
        req.report = {users: []};

        const access = new Acl(req);

        expect(access.check()).toBe(true);
      });

      test('Test valid report PUT/POST/DELETE with bound user', async () => {
        req.method = 'PUT';
        req.report = report;

        const access = new Acl(req);

        expect(access.check()).toBe(true);
      });

      test('Test invalid report GET', async () => {
        req.method = 'GET';
        req.report = report;

        const access = new Acl(req);
        access.read = ['clinician'];

        expect(access.check()).toBe(false);
      });
    });

    describe('Test non-report endpoints in check method', () => {

      beforeEach(async () => {
        req.user = testUser;
      });

      afterEach(async () => {
        req = {};
      });

      test('Test valid non-report GET', async () => {
        req.method = 'GET';
        req.user.groups = [{name: 'Bioinformatician'}];

        const access = new Acl(req);
        access.read = ['*'];

        expect(access.check()).toBe(true);
      });

      test('Test valid non-report PUT/POST/DELETE', async () => {
        req.method = 'PUT';
        req.user.groups = [{name: 'Clinician'}];

        const access = new Acl(req);
        access.write = ['Clinician'];

        expect(access.check()).toBe(true);
      });

      test('Test invalid non-report GET', async () => {
        req.method = 'GET';
        req.user.groups = [{name: 'Bioinformatician'}];

        const access = new Acl(req);
        access.read = ['admin'];

        expect(access.check()).toBe(false);
      });
    });
  });

  describe('Test ACL isAdmin method', () => {
    test.todo('Test when user is an admin');

    test.todo('Test when user is not an admin');
  });
});
