const {v4: uuidv4} = require('uuid');

const db = require('../../../app/models');
const CONFIG = require('../../../app/config');
const email = require('../../../app/libs/email');
// queue is globally mocked (config/jest/jestSetup.js); setupQueues() returns the queued jobs
const queue = require('../../../app/queue');

const DOMAIN = '@notiftest.com';
const SUBJECT = 'Report Created: X';

describe('notifyUsers environment gating', () => {
  let project;
  let template;
  let user;
  let notif;
  let adminGroup;
  let adminMembership;
  let triggers;
  let jobs;
  let getSpy;

  // nconf set() can't override nested config defaults in-process, so spy on CONFIG.get instead
  let currentEnv = 'test';

  beforeAll(async () => {
    project = await db.models.project.create({name: `notif-env-${uuidv4()}`});
    template = await db.models.template.create({
      name: uuidv4(),
      organization: 'Test Create Org',
      description: 'template used for notifyUsers env tests',
      sections: ['microbial'],
    });

    const uniqueUsername = uuidv4();
    user = await db.models.user.create({
      ident: uuidv4(),
      username: uniqueUsername,
      firstName: `fn_${uniqueUsername}`,
      lastName: `ln_${uniqueUsername}`,
      email: `user_${uniqueUsername}${DOMAIN}`,
      allowNotifications: true,
    });

    notif = await db.models.notification.create({
      ident: uuidv4(),
      projectId: project.id,
      userId: user.id,
      templateId: template.id,
      eventType: 'reportCreated',
    });

    [adminGroup] = await db.models.userGroup.findOrCreate({where: {name: 'admin'}});

    triggers = {userId: user.id, eventType: 'reportCreated'};
    jobs = queue.setupQueues();

    const realGet = CONFIG.get.bind(CONFIG);
    getSpy = jest.spyOn(CONFIG, 'get').mockImplementation((key) => {
      if (key === 'email') {
        return {email: 'PORIReportUpdates', domain: DOMAIN};
      }
      if (key === 'env') {
        return currentEnv;
      }
      return realGet(key);
    });
  });

  afterAll(async () => {
    getSpy.mockRestore();
    if (adminMembership) {
      await adminMembership.destroy({force: true});
    }
    return Promise.all([
      notif.destroy({force: true}),
      user.destroy({force: true}),
      template.destroy({force: true}),
      project.destroy({force: true}),
    ]);
  });

  beforeEach(() => {
    jobs.length = 0;
  });

  test('production - sends to the real recipient with an unmodified subject', async () => {
    currentEnv = 'production';

    await email.notifyUsers(SUBJECT, 'body', triggers);

    expect(jobs).toHaveLength(1);
    expect(jobs[0].mailOptions.to).toEqual(user.email);
    expect(jobs[0].mailOptions.subject).toEqual(SUBJECT);
  });

  test('non-prod - skips recipients who are not admins', async () => {
    currentEnv = 'development';

    await email.notifyUsers(SUBJECT, 'body', triggers);

    expect(jobs).toHaveLength(0);
  });

  test('non-prod - sends to a recipient who is an admin, with a non-prod subject', async () => {
    currentEnv = 'development';
    adminMembership = await db.models.userGroupMember.create({
      group_id: adminGroup.id,
      user_id: user.id,
    });

    await email.notifyUsers(SUBJECT, 'body', triggers);

    expect(jobs).toHaveLength(1);
    expect(jobs[0].mailOptions.to).toEqual(user.email);
    expect(jobs[0].mailOptions.subject).toEqual(`[NON-PROD IPR][reportCreated] ${SUBJECT}`);
  });
});
