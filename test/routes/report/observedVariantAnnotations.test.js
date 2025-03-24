const HTTP_STATUS = require('http-status-codes');

const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../../../app/models');

const mockReportData = require('../../testData/mockRapidReportData.json');
const createReport = require('../../../app/libs/createReport');

const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

const LONGER_TIMEOUT = 100000;

let server;
let request;

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

// Tests for observed-variant-annotations endpts
describe('/reports/{REPORTID}/observed-variant-annotations', () => {
  let rapidReportIdent;

  beforeAll(async () => {
    // Get rapid template
    let rapidTemplate = await db.models.template.findOne({where: {name: 'rapid'}});

    if (!rapidTemplate) {
      rapidTemplate = await db.models.template.create({
        name: 'rapid',
        sections: [],
      });
    }

    rapidReportIdent = await createReport(mockReportData);
  }, LONGER_TIMEOUT);

  describe('POST', () => {
    test('Create new annotation - OK', async () => {
      const res = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'therapeuticAssociation'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      const allvars = res.body.filter((variant) => {
        return variant.variantType === 'cnv'; // choose a random nontherapeutic example
      });

      const variant = allvars[0];
      await request
        .post(`/api/reports/${rapidReportIdent.ident}/observed-variant-annotations`)
        .auth(username, password)
        .type('json')
        .send({
          variantType: 'cnv',
          variantIdent: variant.ident,
          annotations: {rapidReportTableTag: 'cancerRelevance'},
          comments: 'test',
        })
        .expect(HTTP_STATUS.CREATED);

      const allCRVars = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'cancerRelevance'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      const checkVar = allCRVars.body.filter((item) => {
        return item.ident === variant.ident;
      });
      expect(checkVar.length).toEqual(1);
      const annotation = checkVar[0].observedVariantAnnotation;
      expect(annotation.variantType).toEqual('cnv');
      expect(annotation.comments).toEqual('test');
      expect(annotation.annotations.rapidReportTableTag).toEqual('cancerRelevance');
    });

    test('Does not create new annotation with no matching variant - OK', async () => {
      await request
        .post(`/api/reports/${rapidReportIdent.ident}/observed-variant-annotations`)
        .auth(username, password)
        .type('json')
        .send({
          variantType: 'mut',
          variantIdent: 'hello',
          annotations: {rapidReportTableTag: 'therapeutic'},
          comments: 'test',
        })
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('Does not create new annotation with fake variant type- OK', async () => {
      await request
        .post(`/api/reports/${rapidReportIdent.ident}/observed-variant-annotations`)
        .auth(username, password)
        .type('json')
        .send({
          variantType: 'test',
          variantIdent: 'hello',
          annotations: {rapidReportTableTag: 'therapeutic'},
          comments: 'test',
        })
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('Does not create new annotation when variant already has one - OK', async () => {
      const res = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'unknownSignificance'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      const allvars = res.body.filter((variant) => {
        return variant.variantType === 'mut';
      });

      const variant = allvars[0];
      await request
        .post(`/api/reports/${rapidReportIdent.ident}/observed-variant-annotations`)
        .auth(username, password)
        .type('json')
        .send({
          variantType: 'mut',
          variantIdent: variant.ident,
          annotations: {rapidReportTableTag: 'therapeutic'},
          comments: 'test',
        })
        .expect(HTTP_STATUS.CREATED);

      await request
        .post(`/api/reports/${rapidReportIdent.ident}/observed-variant-annotations`)
        .auth(username, password)
        .type('json')
        .send({
          variantType: 'mut',
          variantIdent: variant.ident,
          annotations: {rapidReportTableTag: 'cancerRelevance'},
          comments: 'test2',
        })
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('PUT', () => {
    test('Update existing annotation - comments field - OK', async () => {
      const res = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'unknownSignificance'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      const allvars = res.body.filter((variant) => {
        return variant.variantType === 'mut';
      });

      const variant = allvars[0];

      // create the annotation
      await request
        .post(`/api/reports/${rapidReportIdent.ident}/observed-variant-annotations`)
        .auth(username, password)
        .type('json')
        .send({
          variantType: 'mut',
          variantIdent: variant.ident,
          annotations: {rapidReportTableTag: 'therapeutic'},
          comments: 'test',
        })
        .expect(HTTP_STATUS.CREATED);

      // check that it's present in this list and not in cancer-relevance
      const res1a = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'therapeuticAssociation'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);
      const res1b = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'cancerRelevance'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      const checkVar1a = res1a.body.filter((item) => {
        return item.ident === variant.ident;
      });
      expect(checkVar1a.length).toEqual(1);
      const checkVar1b = res1b.body.filter((item) => {
        return item.ident === variant.ident;
      });
      expect(checkVar1b.length).toEqual(0);

      // do the update
      await request
        .put(`/api/reports/${rapidReportIdent.ident}/observed-variant-annotations/${checkVar1a[0].observedVariantAnnotation.ident}`)
        .auth(username, password)
        .type('json')
        .send({
          annotations: {rapidReportTableTag: 'cancerRelevance'},
          comments: 'test2',
        })
        .expect(HTTP_STATUS.OK);

      // check that it's updated (moved to diff list)
      const res2a = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'therapeuticAssociation'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);
      const res2b = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'cancerRelevance'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      const checkVar2a = res2a.body.filter((item) => {
        return item.ident === variant.ident;
      });
      expect(checkVar2a.length).toEqual(0);
      const checkVar2b = res2b.body.filter((item) => {
        return item.ident === variant.ident;
      });
      expect(checkVar2b.length).toEqual(1);
    });
  });

  // delete report
  afterAll(async () => {
    await db.models.report.destroy({where: {ident: rapidReportIdent.ident}});
    // , force: true
  }, LONGER_TIMEOUT);
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
