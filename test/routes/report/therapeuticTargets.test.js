const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');
const {Op} = require('sequelize');

const db = require('../../../app/models');
// get test user info
const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

const LONGER_TIMEOUT = 5000;

// get credentials from the CONFIG
CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

const FAKE_TARGET = {
  type: 'therapeutic',
  variant: 'p.G12D',
  gene: 'KRASSS',
  geneGraphkbId: '#2:3',
  context: 'resistance',
  therapy: 'EGFR inhibitors',
  evidenceLevel: 'OncoKB 1',
  iprEvidenceLevel: 'IPR-A',
};

let server;
let request;

beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/therapeutic-targets', () => {
  let report;
  let createdIdent;

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // create report
    report = await db.models.report.create({
      templateId: template.id,
      patientId: 'PATIENT1234',
    });
  });

  beforeEach(() => {
    createdIdent = null;
  });

  afterEach(async () => {
    if (createdIdent) {
      // clean up the new record if one was created
      await db.models.therapeuticTarget.destroy({
        where: {ident: createdIdent},
        force: true,
      });
    }
  });

  describe('POST (create)', () => {
    test('create new with valid input', async () => {
      const {body: record} = await request
        .post(`/api/reports/${report.ident}/therapeutic-targets`)
        .auth(username, password)
        .type('json')
        .send({...FAKE_TARGET})
        .expect(HTTP_STATUS.CREATED);
      // check that expected property not present in request body is added by create method
      expect(record).toHaveProperty('variantGraphkbId', null);
      expect(record).toHaveProperty('ident');

      createdIdent = record.ident;
    });

    test.todo('Bad request on missing required parameter (gene)');
  });

  describe('tests dependent on an existing therapeutic target', () => {
    let original;
    let url;

    beforeEach(async () => {
      // create a new therapeutic target
      ({dataValues: original} = await db.models.therapeuticTarget.create({
        ...FAKE_TARGET,
        reportId: report.id,
      }));
      url = `/api/reports/${report.ident}/therapeutic-targets/${original.ident}`;

      expect(original).toHaveProperty('ident');
      expect(original).toHaveProperty('id');
    });

    afterEach(async () => {
      if (original) {
        // clean up the new record if one was created
        await db.models.therapeuticTarget.destroy({
          where: {ident: original.ident},
          force: true,
        });
      }
    });

    describe('GET', () => {
      test('all targets for a report', async () => {
        const {body: result} = await request
          .get(`/api/reports/${report.ident}/therapeutic-targets`)
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.OK);
        expect(Array.isArray(result)).toBe(true);
        expect(result.map((r) => {
          return r.gene;
        })).toContain(original.gene); // easier to debug failures
        expect(result.map((r) => {
          return r.ident;
        })).toContain(original.ident);
      });

      test('a single target by ID', async () => {
        const {body: result} = await request
          .get(url)
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.OK);
        expect(result).toHaveProperty('ident', original.ident);
        expect(result).toHaveProperty('gene', original.gene);
        expect(result).not.toHaveProperty('deletedAt');
        expect(result).not.toHaveProperty('id');
      });
    });

    describe('PUT', () => {
      test('update with valid input', async () => {
        const {body: record} = await request
          .put(url)
          .auth(username, password)
          .send({gene: 'BRAF'})
          .type('json')
          .expect(HTTP_STATUS.OK);

        expect(record).toHaveProperty('gene', 'BRAF');

        // should now find a deleted record with this ident
        const result = await db.models.therapeuticTarget.findOne({
          paranoid: false,
          where: {ident: original.ident, deletedAt: {[Op.not]: null}},
        });
        expect(result).toHaveProperty('deletedAt');
      });

      test('Update should not accept reportId', async () => {
        await request
          .put(url)
          .auth(username, password)
          .send({
            reportId: 1,
            gene: 'BRAF',
          })
          .type('json')
          .expect(HTTP_STATUS.BAD_REQUEST);
      });

      describe('tests depending on multiple targets present', () => {
        let newTarget;

        beforeEach(async () => {
          // create a new therapeutic target
          ({dataValues: newTarget} = await db.models.therapeuticTarget.create({
            ...FAKE_TARGET,
            rank: 1,
            reportId: report.id,
          }));

          expect(newTarget).toHaveProperty('id');
          expect(newTarget).toHaveProperty('ident');
          expect(newTarget).toHaveProperty('rank');
        });

        afterEach(async () => {
          if (newTarget) {
            // clean up the new record if one was created
            await db.models.therapeuticTarget.destroy({
              where: {ident: newTarget.ident},
              force: true,
            });
          }
        });

        test('update target ranks with non-duplicate rank', async () => {
          await request
            .put(`/api/reports/${report.ident}/therapeutic-targets`)
            .auth(username, password)
            .send([
              {ident: original.ident, rank: newTarget.rank},
              {ident: newTarget.ident, rank: original.rank},
            ])
            .type('json')
            .expect(HTTP_STATUS.OK);
        }, LONGER_TIMEOUT);

        test('update target ranks with duplicate rank', async () => {
          await request
            .put(`/api/reports/${report.ident}/therapeutic-targets`)
            .auth(username, password)
            .send([
              {ident: original.ident, rank: 2},
              {ident: newTarget.ident, rank: 2},
            ])
            .type('json')
            .expect(HTTP_STATUS.BAD_REQUEST);
        }, LONGER_TIMEOUT);
      });

      test.todo('Bad request on update and set gene to null');
    });

    describe('DELETE', () => {
      test('deleting a target', async () => {
        await request
          .delete(url)
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.NO_CONTENT);
        // should now find a deleted record with this ident
        const result = await db.models.therapeuticTarget.findOne({
          paranoid: false,
          where: {ident: original.ident},
        });
        expect(result).toHaveProperty('deletedAt');
      });

      test('updating all other targets rank on delete', async () => {
        // Create second record
        const newTarget = await db.models.therapeuticTarget.create({
          ...FAKE_TARGET,
          rank: 1,
          reportId: report.id,
        });

        await request
          .delete(url)
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.NO_CONTENT);

        // should now only find the second record
        const result = await db.models.therapeuticTarget.findAll({
          where: {reportId: report.id},
        });

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(1);

        const [entry] = result;

        expect(entry.ident).toBe(newTarget.ident);
        expect(entry.rank).toBe(newTarget.rank - 1);
      });
    });
  });

  afterAll(async () => {
    // Delete newly created report and all of it's components
    // indirectly by force deleting the report
    return db.models.report.destroy({where: {ident: report.ident}, force: true});
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
