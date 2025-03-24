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

const variantsProperties = [
  'ident', 'kbMatches',
];

const checkVariants = (variantsObject) => {
  variantsProperties.forEach((element) => {
    expect(variantsObject).toHaveProperty(element);
  });
};

const checkRapidReportMatches = (
  variants,
  expectedTable,
) => {
  let found = true;

  let kbMatches = [];

  for (const variant of variants) {
    kbMatches = kbMatches.concat(variant.kbMatches);
  }

  kbMatches.forEach((match) => {
    match.kbMatchedStatements.forEach((statement) => {
      if (!(statement.evidenceLevel === expectedTable)) {
        found = false;
      }
    });
  });

  expect(found).toBe(true);
};

const checkVariantsFilter = (
  variants,
  expectedTable,
) => {
  let found = true;

  variants.forEach((variant) => {
    if (!(variant.displayName === expectedTable)) {
      found = false;
    }
  });

  expect(found).toBe(true);
};

const variantInList = (variant, variantList) => {
  const matches = variantList.find((item) => {
    const found = ((item.ident === variant.ident) && (item.variantType === variant.variantType));
    return found;
  });
  return matches !== undefined;
};

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

// Tests for /kb-matches endpoint
describe('/reports/{REPORTID}/kb-matches', () => {
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

  describe('GET', () => {
    test('Getting Therapeutic Association - OK', async () => {
      const res = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'therapeuticAssociation'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      checkVariants(res.body[0]);

      checkVariantsFilter(
        res.body,
        'table 1',
      );
      checkRapidReportMatches(
        res.body,
        'table 1',
      );
    });

    test('Getting Cancer Relevance - OK', async () => {
      const res = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'cancerRelevance'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      checkVariants(res.body[0]);

      checkVariantsFilter(
        res.body,
        'table 2',
      );
      checkRapidReportMatches(
        res.body,
        'table 2',
      );
    });

    test('Getting Unknown Significance - OK', async () => {
      const res = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'unknownSignificance'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      checkVariants(res.body[0]);

      checkVariantsFilter(
        res.body,
        'table 3',
      );
      checkRapidReportMatches(
        res.body,
        'table 3',
      );
    });

    test('Tagging non-therapeutic var as therapeutic moves it to therapeutic - OK', async () => {
      // get first mut-type unknown sig var, tag it as therapeutic
      const res = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'unknownSignificance'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      const allvars = res.body.filter((variant) => {
        return variant.variantType === 'mut';
      });
      const testvar = allvars[0];
      await request
        .post(`/api/reports/${rapidReportIdent.ident}/observed-variant-annotations`)
        .auth(username, password)
        .type('json')
        .send({
          variantType: testvar.variantType,
          variantIdent: testvar.ident,
          annotations: {rapidReportTableTag: 'therapeutic'},
        })
        .expect(HTTP_STATUS.CREATED);

      // check it is now in therapeutic and is not in any other variant list
      const therapeutics = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'therapeuticAssociation'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);
      const cancerRelevance = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'cancerRelevance'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);
      const unknownSig = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'unknownSignificance'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      const variantIsTherapeutic = variantInList(testvar, therapeutics.body);
      expect(variantIsTherapeutic).toBe(true);
      const variantIsCancerRelevant = variantInList(testvar, cancerRelevance.body);
      expect(variantIsCancerRelevant).toBe(false);
      const variantIsUnknown = variantInList(testvar, unknownSig.body);
      expect(variantIsUnknown).toBe(false);
    });

    test('Tagging non-cancerRelevance var as cancerRelevance moves it to cancer relevance - OK', async () => {
      // get first unknown sig variant of mut type, tag it as cancer relevance
      const res = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'unknownSignificance'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);
      expect(Array.isArray(res.body)).toBe(true);
      const allvars = res.body.filter((variant) => {
        return variant.variantType === 'mut';
      });
      const testvar = allvars[0];
      await request
        .post(`/api/reports/${rapidReportIdent.ident}/observed-variant-annotations`)
        .auth(username, password)
        .type('json')
        .send({
          variantType: testvar.variantType,
          variantIdent: testvar.ident,
          annotations: {rapidReportTableTag: 'cancerRelevance'},
        })
        .expect(HTTP_STATUS.CREATED);

      // check it is now in cancer-relevance and is not in any other variant list
      const therapeutics = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'therapeuticAssociation'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);
      const cancerRelevance = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'cancerRelevance'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);
      const unknownSig = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'unknownSignificance'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      const variantIsTherapeutic = variantInList(testvar, therapeutics.body);
      expect(variantIsTherapeutic).toBe(false);
      const variantIsCancerRelevant = variantInList(testvar, cancerRelevance.body);
      expect(variantIsCancerRelevant).toBe(true);
      const variantIsUnknown = variantInList(testvar, unknownSig.body);
      expect(variantIsUnknown).toBe(false);
    });

    test('Tagging non-unknownSig var as unknown sig moves it to unknown sig - OK', async () => {
      // get first eligible therapeutic var, tag it as unknown sig
      const res = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'therapeuticAssociation'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);
      expect(Array.isArray(res.body)).toBe(true);
      const allvars = res.body.filter((variant) => {
        // ensuring this is not an already-annotated var, since we used mut before
        return variant.variantType === 'cnv';
      });
      const testvar = allvars[0];
      await request
        .post(`/api/reports/${rapidReportIdent.ident}/observed-variant-annotations`)
        .auth(username, password)
        .type('json')
        .send({
          variantType: testvar.variantType,
          variantIdent: testvar.ident,
          annotations: {rapidReportTableTag: 'unknownSignificance'},
        })
        .expect(HTTP_STATUS.CREATED);

      // check that it's now in unknown sig, and not in any other variant list
      const therapeutics = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'therapeuticAssociation'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);
      const cancerRelevance = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'cancerRelevance'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);
      const unknownSig = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'unknownSignificance'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      const variantIsTherapeutic = variantInList(testvar, therapeutics.body);
      expect(variantIsTherapeutic).toBe(false);
      const variantIsCancerRelevant = variantInList(testvar, cancerRelevance.body);
      expect(variantIsCancerRelevant).toBe(false);
      const variantIsUnknown = variantInList(testvar, unknownSig.body);
      expect(variantIsUnknown).toBe(true);
    });

    test('Tagging variant with noTable removes it from rapid report summary results - OK', async () => {
      // grab first available therapeutic variant, tag it as noTable
      const res = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'therapeuticAssociation'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);
      expect(Array.isArray(res.body)).toBe(true);
      const allvars = res.body.filter((variant) => {
        // ensuring this is not an already-annotated var, since we used mut and cnv before
        return variant.variantType === 'msi';
      });
      const testvar = allvars[0];
      await request
        .post(`/api/reports/${rapidReportIdent.ident}/observed-variant-annotations`)
        .auth(username, password)
        .type('json')
        .send({
          variantType: testvar.variantType,
          variantIdent: testvar.ident,
          annotations: {rapidReportTableTag: 'noTable'},
        })
        .expect(HTTP_STATUS.CREATED);

      // check that it's now not in any variant list
      const therapeutics = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'therapeuticAssociation'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);
      const cancerRelevance = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'cancerRelevance'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);
      const unknownSig = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'unknownSignificance'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      const variantIsTherapeutic = variantInList(testvar, therapeutics.body);
      expect(variantIsTherapeutic).toBe(false);
      const variantIsCancerRelevant = variantInList(testvar, cancerRelevance.body);
      expect(variantIsCancerRelevant).toBe(false);
      const variantIsUnknown = variantInList(testvar, unknownSig.body);
      expect(variantIsUnknown).toBe(false);
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
