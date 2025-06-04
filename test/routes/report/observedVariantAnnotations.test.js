const {StatusCodes} = require('http-status-codes');

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

const getVariantByIdent = async (ident, reportIdent) => {
  const allVars = await request
    .get(`/api/reports/${reportIdent}/variants`)
    .query()
    .auth(username, password)
    .type('json')
    .expect(StatusCodes.OK);

  const checkVar = allVars.body.filter((item) => {
    return item.ident === ident;
  });
  expect(checkVar.length).toEqual(1);
  return checkVar[0];
};

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
    test('Create new annotation - OK', async () => {
      const res = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'therapeuticAssociation'})
        .auth(username, password)
        .type('json')
        .expect(StatusCodes.OK);

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
        })
        .expect(StatusCodes.CREATED);

      const checkVar = await getVariantByIdent(variant.ident, rapidReportIdent.ident);
      const annotation = checkVar.observedVariantAnnotation;
      expect(annotation.variantType).toEqual('cnv');
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
        })
        .expect(StatusCodes.BAD_REQUEST);
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
        })
        .expect(StatusCodes.BAD_REQUEST);
    });

    test('Does not create new annotation when variant already has one - OK', async () => {
      const res = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'unknownSignificance'})
        .auth(username, password)
        .type('json')
        .expect(StatusCodes.OK);

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
        })
        .expect(StatusCodes.CREATED);

      await request
        .post(`/api/reports/${rapidReportIdent.ident}/observed-variant-annotations`)
        .auth(username, password)
        .type('json')
        .send({
          variantType: 'mut',
          variantIdent: variant.ident,
          annotations: {rapidReportTableTag: 'cancerRelevance'},
        })
        .expect(StatusCodes.CONFLICT);
    });
  });

  // TODO
  describe('PUT', () => {
    test('Update existing annotation - OK', async () => {
      const res = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'unknownSignificance'})
        .auth(username, password)
        .type('json')
        .expect(StatusCodes.OK);

      const allvars = res.body.filter((variant) => {
        return variant.variantType === 'mut';
      });

      const annotations = {rapidReportTableTag: 'therapeutic', secondTag: 'testValue'};

      const origVariant = allvars[0];

      // create the annotation
      await request
        .post(`/api/reports/${rapidReportIdent.ident}/observed-variant-annotations`)
        .auth(username, password)
        .type('json')
        .send({
          variantType: 'mut',
          variantIdent: origVariant.ident,
          annotations,
        })
        .expect(StatusCodes.CREATED);

      // get the created variant annotation and check it's correct
      const createdVar = await getVariantByIdent(origVariant.ident, rapidReportIdent.ident);
      expect(createdVar.observedVariantAnnotation.annotations.secondTag).toEqual(annotations.secondTag);
      expect(createdVar.observedVariantAnnotation.annotations.rapidReportTableTag).toEqual(annotations.rapidReportTableTag);

      // do the update
      const updatedSecondTag = 'testValue2';
      annotations.secondTag = updatedSecondTag;

      await request
        .put(`/api/reports/${rapidReportIdent.ident}/observed-variant-annotations/${createdVar.observedVariantAnnotation.ident}`)
        .auth(username, password)
        .type('json')
        .send({
          annotations,
        })
        .expect(StatusCodes.OK);

      // get the new variant data
      const updatedVar = await getVariantByIdent(origVariant.ident, rapidReportIdent.ident);
      expect(updatedVar.observedVariantAnnotation.annotations.secondTag).toEqual(updatedSecondTag);
      expect(updatedVar.observedVariantAnnotation.annotations.rapidReportTableTag).toEqual(annotations.rapidReportTableTag);
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
        .expect(StatusCodes.OK);

      let record;
      let annotation;
      if (variantType === 'tmb') {
        record = res.body;
        annotation = res.body.observedVariantAnnotation.ident;
      } else {
        [record] = res.body;
        annotation = record.observedVariantAnnotation;
      }
      expect(annotation).toBe(null);

      const annotations = {testTag: 'testTagValue'};
      await request
        .post(`/api/reports/${reportIdent.ident}/observed-variant-annotations`)
        .auth(username, password)
        .type('json')
        .send({
          variantType,
          variantIdent: record.ident,
          annotations,
        })
        .expect(StatusCodes.CREATED);

      let url = `/api/reports/${reportIdent.ident}/${endpt}/${record.ident}`;
      if (variantType === 'tmb') {
        url = `/api/reports/${reportIdent.ident}/${endpt}`;
      }

      const res2 = await request
        .get(url)
        .auth(username, password)
        .type('json')
        .expect(StatusCodes.OK);
      const record2 = res2.body;
      expect(record2.observedVariantAnnotation.annotations.testTag).toEqual(annotations.testTag);
    });

    test('Annotations delivered with variants endpt - OK', async () => {
      const res = await request
        .get(`/api/reports/${reportIdent.ident}/variants`)
        .auth(username, password)
        .type('json')
        .expect(StatusCodes.OK);

      expect(Array.isArray(res.body)).toBe(true);

      const annotations = {testTag: 'testTagValue'};

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
          annotations,
        })
        .expect(StatusCodes.CREATED);

      const res2 = await request
        .get(`/api/reports/${reportIdent.ident}/variants`)
        .auth(username, password)
        .type('json')
        .expect(StatusCodes.OK);
      const updatedRecord = res2.body.filter((variant) => {
        return variant.ident === record.ident;
      })[0];
      expect(updatedRecord.observedVariantAnnotation.annotations.testTag).toEqual(annotations.testTag);
    });

    test('Annotations delivered with rapid report variants endpt - OK', async () => {
      const res = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .auth(username, password)
        .type('json')
        .expect(StatusCodes.OK);

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
          annotations: {rapidReportTableTag: 'cancerRelevance', testTag: 'testValue'},
        })
        .expect(StatusCodes.CREATED);

      const res2 = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'cancerRelevance'})
        .auth(username, password)
        .type('json')
        .expect(StatusCodes.OK);
      const updatedRecord = res2.body.filter((variant) => {
        return variant.ident === record.ident;
      })[0];

      expect(updatedRecord.observedVariantAnnotation.annotations.testTag).toEqual('testValue');
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
