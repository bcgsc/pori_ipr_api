const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');
const {Op} = require('sequelize');

const db = require('../../app/models');
// get test user info
const CONFIG = require('../../app/config');
const {listen} = require('../../app');

// get credentials from the CONFIG
CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

const FAKE_TARGET = {
  type: 'therapeutic',
  variant: 'p.G12D',
  gene: 'KRAS',
  geneGraphkbId: '#2:3',
  context: 'resistance',
  therapy: 'EGFR inhibitors',
  rank: 1,
  evidenceLevel: 'OncoKB 1',
};

describe('/therapeuticTargets', () => {
  let server;
  let request;
  let reportIdent;
  let createdIdent;

  beforeAll(async () => {
    const port = await getPort({port: CONFIG.get('web:port')});
    server = await listen(port);
    request = supertest(server);
    // connect to the db
    // find a report (any report)
    const {ident} = await db.models.analysis_report.findOne({
      attributes: ['ident'],
      where: {deletedAt: null},
    });
    reportIdent = ident;
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

  describe('create new', () => {
    test('valid input', async () => {
      const {body: record} = await request
        .post(`/api/1.0/POG/FAKE/report/${reportIdent}/genomic/therapeuticTargets`)
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


  describe('modify existing', () => {
    let original;
    let url;

    beforeEach(async () => {
      // create a new therapeutic target
      ({dataValues: original} = await db.models.therapeuticTarget.create({
        ...FAKE_TARGET,
      }));
      url = `/api/1.0/POG/FAKE/report/${reportIdent}/genomic/therapeuticTargets/${original.ident}`;
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

    test('setup ok', () => {
      expect(original).toHaveProperty('ident');
    });

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

    test.todo('Bad request on update and set gene to null');

    test('delete', async () => {
      await request
        .delete(url)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);
      // should now find a deleted record with this ident
      const result = await db.models.therapeuticTarget.findOne({
        paranoid: false,
        where: {ident: original.ident},
      });
      expect(result).toHaveProperty('deletedAt');
    });
  });

  afterAll(async () => {
    // tear down the server
  });
});
