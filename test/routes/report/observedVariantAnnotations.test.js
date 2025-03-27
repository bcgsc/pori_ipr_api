const HTTP_STATUS = require('http-status-codes');

const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../../../app/models');

const mockGenomicReportData = require('../../testData/mockReportData.json');
const mockReportData = require('../../testData/mockRapidReportData.json');
const createReport = require('../../../app/libs/createReport');

const {KB_PIVOT_MAPPING} = require('../../../app/constants');

const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

const LONGER_TIMEOUT = 100000;

let server;
let request;

function camelToKebab(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

// Tests for observed-variant-annotations endpts
describe('/reports/{REPORTID}/observed-variant-annotations', () => {
  let rapidReportIdent;
  let reportIdent;

  beforeAll(async () => {
    // Get rapid template
    let rapidTemplate = await db.models.template.findOne({where: {name: 'rapid'}});

    if (!rapidTemplate) {
      rapidTemplate = await db.models.template.create({
        name: 'rapid',
        sections: [],
      });
    }

    let genomicTemplate = await db.models.template.findOne({where: {name: 'genomic'}});

    if (!genomicTemplate) {
      genomicTemplate = await db.models.template.create({
        name: 'genomic',
        sections: [],
      });
    }

    rapidReportIdent = await createReport(mockReportData);
    reportIdent = await createReport(mockGenomicReportData);
  }, LONGER_TIMEOUT);

  describe('POST', () => {
    test.skip('Create new annotation - OK', async () => {
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

    test.skip('Does not create new annotation with no matching variant - OK', async () => {
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

    test.skip('Does not create new annotation with fake variant type- OK', async () => {
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

    test.skip('Does not create new annotation when variant already has one - OK', async () => {
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
    test.skip('Update existing annotation - comments field - OK', async () => {
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

  describe('Annotations should be delivered with variant endpts', () => {
    test.each(Object.keys(KB_PIVOT_MAPPING))('Annotations should be delivered with %s endpoint -OK', async (variantType) => {
      let endpt = camelToKebab(KB_PIVOT_MAPPING[variantType]);
      if (variantType === 'tmb') {
        endpt = 'tmbur-mutation-burden';
      }

      const res = await request
        .get(`/api/reports/${reportIdent.ident}/${endpt}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      let record;
      let annotation;
      if (variantType === 'tmb') {
        record = res.body;
        annotation = res.body.observedVariantAnnotation.ident
      } else {
        expect(Array.isArray(res.body)).toBe(true);
        [record] = res.body;
        annotation = record.observedVariantAnnotation;
      }
      expect(annotation).toBe(null);

      await request
        .post(`/api/reports/${reportIdent.ident}/observed-variant-annotations`)
        .auth(username, password)
        .type('json')
        .send({
          variantType,
          variantIdent: record.ident,
          comments: endpt,
        })
        .expect(HTTP_STATUS.CREATED);

      let url = `/api/reports/${reportIdent.ident}/${endpt}/${record.ident}`;
      if (variantType === 'tmb') {
        url = `/api/reports/${reportIdent.ident}/${endpt}`;
      }

      const res2 = await request
        .get(url)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);
      const record2 = res2.body;
      expect(record2.observedVariantAnnotation.comments).toEqual(endpt);
    });

    test('Annotations delivered with variants endpt - OK', async () => {
      const res = await request
        .get(`/api/reports/${reportIdent.ident}/variants`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);

      // get the first unannotated var for this test
      const unannotatedVars = res.body.filter((variant) => {
        return variant.observedVariantAnnotation === null;
      });

      const record = unannotatedVars[0];
      expect(record).toHaveProperty('observedVariantAnnotation');
      expect(record.observedVariantAnnotation).toBe(null);

      await request
        .post(`/api/reports/${reportIdent.ident}/observed-variant-annotations`)
        .auth(username, password)
        .type('json')
        .send({
          variantType: record.variantType,
          variantIdent: record.ident,
          comments: 'general variants endpt',
        })
        .expect(HTTP_STATUS.CREATED);

      const res2 = await request
        .get(`/api/reports/${reportIdent.ident}/variants`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);
      const updatedRecord = res2.body.filter((variant) => {
        return variant.ident === record.ident;
      })[0];
      expect(updatedRecord.observedVariantAnnotation.comments).toEqual('general variants endpt');
    });

    test('Annotations delivered with rapid report variants endpt - OK', async () => {
      const res = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);

      // get the first unannotated var for this test
      const unannotatedVars = res.body.filter((variant) => {
        return variant.observedVariantAnnotation === null;
      });

      const record = unannotatedVars[0];
      expect(record).toHaveProperty('observedVariantAnnotation');
      expect(record.observedVariantAnnotation).toBe(null);

      await request
        .post(`/api/reports/${rapidReportIdent.ident}/observed-variant-annotations`)
        .auth(username, password)
        .type('json')
        .send({
          variantType: record.variantType,
          variantIdent: record.ident,
          comments: 'rapid report variants endpt',
          annotations: {rapidReportTableTag: 'cancerRelevance'},
        })
        .expect(HTTP_STATUS.CREATED);

      const res2 = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'cancerRelevance'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);
      const updatedRecord = res2.body.filter((variant) => {
        return variant.ident === record.ident;
      })[0];

      expect(updatedRecord.observedVariantAnnotation.comments).toEqual('rapid report variants endpt');
    });
  });

  // delete report
  afterAll(async () => {
    await db.models.report.destroy({where: {ident: rapidReportIdent.ident}});
    await db.models.report.destroy({where: {ident: reportIdent.ident}});

    // , force: true
  }, LONGER_TIMEOUT);
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
