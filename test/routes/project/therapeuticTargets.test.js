const getPort = require('get-port');
const supertest = require('supertest');
const HTTP_STATUS = require('http-status-codes');

const db = require('../../../app/models');
const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

const targetProperties = [
  'ident', 'createdAt', 'updatedAt', 'type', 'notes',
  'gene', 'geneGraphkbId', 'variant', 'variantGraphkbId',
  'therapy', 'therapyGraphkbId', 'context', 'contextGraphkbId',
  'evidenceLevel', 'evidenceLevelGraphkbId', 'kbStatementIds',
  'report', 'iprEvidenceLevel',
];

const checkTarget = (targetObject) => {
  targetProperties.forEach((element) => {
    expect(targetObject).toHaveProperty(element);
  });
  expect(targetObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    reportId: expect.any(Number),
    rank: expect.any(Number),
    updatedBy: expect.any(Number),
    deletedAt: expect.any(String),
  }));
};

const checkTargets = (targets) => {
  targets.forEach((target) => {
    checkTarget(target);
  });
};

let server;
let request;

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

// Tests for project search endpoint
describe('/project/:project/therapeutic-targets', () => {
  let project;
  let report1;
  let report2;
  let report3;

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});

    // Create project
    project = await db.models.project.create({
      name: 'target-project-test',
    });

    // Create reports
    [report1, report2, report3] = await Promise.all([
      db.models.report.create({
        templateId: template.id,
        patientId: 'TEST-THERAPEUTIC-TARGET-REPORT-01',
      }),
      db.models.report.create({
        templateId: template.id,
        patientId: 'TEST-THERAPEUTIC-TARGET-REPORT-02',
      }),
      db.models.report.create({
        templateId: template.id,
        patientId: 'TEST-THERAPEUTIC-TARGET-REPORT-03',
      }),
    ]);

    // Bind reports to projects (don't bind second report)
    await Promise.all([
      db.models.reportProject.create({
        reportId: report1.id,
        project_id: project.id,
      }),
      db.models.reportProject.create({
        reportId: report3.id,
        project_id: project.id,
      }),
    ]);

    // Create therapeutic targets
    await Promise.all([
      db.models.therapeuticTarget.create({
        reportId: report1.id,
        rank: 0,
        type: 'therapeutic',
        variant: 'TEST VARIANT 1',
        therapy: 'TEST THERAPY 1',
        context: 'TEST CONTEXT 1',
      }),
      db.models.therapeuticTarget.create({
        reportId: report1.id,
        rank: 1,
        type: 'therapeutic',
        variant: 'TEST VARIANT 2',
        therapy: 'TEST THERAPY 2',
        context: 'TEST CONTEXT 2',
      }),
      db.models.therapeuticTarget.create({
        reportId: report2.id,
        rank: 0,
        type: 'therapeutic',
        variant: 'TEST VARIANT 3',
        therapy: 'TEST THERAPY 3',
        context: 'TEST CONTEXT 3',
      }),
      db.models.therapeuticTarget.create({
        reportId: report2.id,
        rank: 1,
        type: 'therapeutic',
        variant: 'TEST VARIANT 4',
        therapy: 'TEST THERAPY 4',
        context: 'TEST CONTEXT 4',
      }),
      db.models.therapeuticTarget.create({
        reportId: report3.id,
        rank: 0,
        type: 'therapeutic',
        variant: 'TEST VARIANT 5',
        therapy: 'TEST THERAPY 5',
        context: 'TEST CONTEXT 5',
      }),
    ]);
  });

  afterAll(async () => {
    await Promise.all([
      report1.destroy({force: true}),
      report2.destroy({force: true}),
      report3.destroy({force: true}),
    ]);
    return project.destroy({force: true});
  });

  describe('GET', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .get(`/api/project/${project.ident}/therapeutic-targets`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();
      expect(res.body.count).toBe(3);
      expect(Array.isArray(res.body.rows)).toBe(true);
      checkTargets(res.body.rows);
    });
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
