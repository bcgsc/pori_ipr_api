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
    console.log('here at 99');
    rapidReportIdent = await createReport(mockReportData);
    console.log('here at 101');
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
      // Use set-summary-table endpoint instead
      const kbStatementIds = (testvar.kbMatches[0]?.kbMatchedStatements || []).map((s) => {return s.ident;});

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

// New tests for /set-summary-table endpoint
describe.skip('/reports/{REPORTID}/variants/set-summary-table', () => {
  let rapidReportIdent;

  beforeEach(async () => {
    // Create a rapid report for each test
    let rapidTemplate = await db.models.template.findOne({where: {name: 'rapid'}});
    if (!rapidTemplate) {
      rapidTemplate = await db.models.template.create({
        name: 'rapid',
        sections: [],
      });
    }
    rapidReportIdent = await createReport(mockReportData);
  });

  afterEach(async () => {
    // Destroy the report after each test
    await db.models.report.destroy({where: {ident: rapidReportIdent.ident}});
  });

  test('POST set-summary-table updates summary table tags for variant and statements', async () => {
    // Get TA3 variant and its kbMatchedStatements
    const res = await request
      .get(`/api/reports/${rapidReportIdent.ident}/variants`)
      .query({rapidTable: 'cancerRelevance'})
      .auth(username, password)
      .type('json');
    const allvars = res.body.filter((variant) => {
      return variant.variantType === 'cnv' && variant.gene.name === 'TA3gene';
    });

    const testVariant = allvars[0];
    const testKbStatementIds = [];
    for (const kbMatch of testVariant.kbMatches || []) {
      for (const statement of kbMatch.kbMatchedStatements || []) {
        if (statement?.ident) {
          testKbStatementIds.push(statement.ident);
        }
      }
    }
    const payload = {
      variantIdent: testVariant.ident,
      variantType: testVariant.variantType,
      kbStatementIds: testKbStatementIds,
      annotations: {rapidReportTableTag: 'therapeuticAssociation'},
    };
    await request
      .post(`/api/reports/${rapidReportIdent.ident}/variants/set-summary-table/`)
      .auth(username, password)
      .type('json')
      .send(payload)
      .expect(HTTP_STATUS.NO_CONTENT);
    // fetch variant again and check annotation/kbMatchedStatements updated
    const res2 = await request
      .get(`/api/reports/${rapidReportIdent.ident}/variants`)
      .query({rapidTable: 'therapeuticAssociation'})
      .auth(username, password)
      .type('json')
      .expect(HTTP_STATUS.OK);
    // Check that the variant and its statements have the rapidReportTableTag
    const updatedVariant = res2.body.find((v) => {return v.ident === testVariant.ident;});
    expect(updatedVariant).toBeDefined();
    // Check kbMatchedStatements rapidReportTableTag
    const statements = updatedVariant.kbMatches.flatMap((kb) => {return kb.kbMatchedStatements;});
    statements.forEach((stmt) => {
      const tagDict = stmt.kbData?.rapidReportTableTag?.therapeuticAssociation;
      expect(tagDict).toBeDefined();
      const variantList = tagDict?.[testVariant.variantType];
      expect(Array.isArray(variantList)).toBe(true);
      expect(variantList).toContain(testVariant.ident);
    });
  });

  test('POST tags variant and statements for therapeuticAssociation', async () => {
    // Find TA4 variant with two statements
    const res = await request
      .get(`/api/reports/${rapidReportIdent.ident}/variants`)
      .query({rapidTable: 'cancerRelevance'})
      .auth(username, password)
      .type('json');
    const ta4Variants = res.body.filter((variant) => {
      return variant.variantType === 'cnv' && variant.gene.name === 'TA4gene';
    });
    const [ta4] = ta4Variants;
    // Get kbMatchedStatements for TA4
    // const allStatements = ta4.kbMatches[0]?.kbMatchedStatements || [];
    const allStatements = [];
    for (const kbMatch of ta4.kbMatches || []) {
      for (const statement of kbMatch.kbMatchedStatements || []) {
        if (statement?.ident) {
          allStatements.push(statement.ident);
        }
      }
    }
    expect(allStatements.length).toBeGreaterThanOrEqual(2);
    // Tag only the first statement as therapeuticAssociation

    const singleKbStatementId = [allStatements[0]];
    await request
      .post(`/api/reports/${rapidReportIdent.ident}/variants/set-summary-table/`)
      .auth(username, password)
      .type('json')
      .send({
        variantType: ta4.variantType,
        variantIdent: ta4.ident,
        kbStatementIds: singleKbStatementId,
        annotations: {rapidReportTableTag: 'therapeuticAssociation'},
      })
      .expect(HTTP_STATUS.NO_CONTENT);

    // Check that only the tagged statement is retrieved for therapeuticAssociation
    const therapeuticsRes = await request
      .get(`/api/reports/${rapidReportIdent.ident}/variants`)
      .query({rapidTable: 'therapeuticAssociation'})
      .auth(username, password)
      .type('json')
      .expect(HTTP_STATUS.OK);
    // Find TA4 variant in response

    const table2Res = await request
      .get(`/api/reports/${rapidReportIdent.ident}/variants`)
      .query({rapidTable: 'cancerRelevance'})
      .auth(username, password)
      .type('json')
      .expect(HTTP_STATUS.OK);
    // Find TA4 variant in response

    const ta4Therapeutic = therapeuticsRes.body.find((v) => {return v.ident === ta4.ident;});
    expect(ta4Therapeutic).toBeDefined();

    // Check only the tagged statement is present
    const therapeuticStatements = ta4Therapeutic.kbMatches[0]?.kbMatchedStatements || [];
    expect(therapeuticStatements.length).toBe(1);
    expect(therapeuticStatements[0].ident).toBe(singleKbStatementId[0]);
  });

  test('POST unsets and resets tags for single therapeuticAssociation statement', async () => {
    // Find TA4 variant with two statements
    const res = await request
      .get(`/api/reports/${rapidReportIdent.ident}/variants`)
      .query({rapidTable: 'cancerRelevance'})
      .auth(username, password)
      .type('json');
    const ta4Variants = res.body.filter((variant) => {
      return variant.variantType === 'cnv' && variant.gene.name === 'TA4gene';
    });
    const [ta4] = ta4Variants;
    // Get kbMatchedStatements for TA4
    // const allStatements = ta4.kbMatches[0]?.kbMatchedStatements || [];
    const allStatements = [];
    for (const kbMatch of ta4.kbMatches || []) {
      for (const statement of kbMatch.kbMatchedStatements || []) {
        if (statement?.ident) {
          allStatements.push(statement.ident);
        }
      }
    }
    expect(allStatements.length).toBeGreaterThanOrEqual(2);
    // Tag only the first statement as therapeuticAssociation

    const singleKbStatementId = [allStatements[0]];
    await request
      .post(`/api/reports/${rapidReportIdent.ident}/variants/set-summary-table/`)
      .auth(username, password)
      .type('json')
      .send({
        variantType: ta4.variantType,
        variantIdent: ta4.ident,
        kbStatementIds: allStatements,
        annotations: {rapidReportTableTag: 'therapeuticAssociation'},
      })
      .expect(HTTP_STATUS.NO_CONTENT);

    // Check that only the tagged statement is retrieved for therapeuticAssociation
    const therapeuticsRes = await request
      .get(`/api/reports/${rapidReportIdent.ident}/variants`)
      .query({rapidTable: 'therapeuticAssociation'})
      .auth(username, password)
      .type('json')
      .expect(HTTP_STATUS.OK);
    // Find TA4 variant in response

    const table2Res = await request
      .get(`/api/reports/${rapidReportIdent.ident}/variants`)
      .query({rapidTable: 'cancerRelevance'})
      .auth(username, password)
      .type('json')
      .expect(HTTP_STATUS.OK);
    // Find TA4 variant in response

    const ta4Therapeutic = therapeuticsRes.body.find((v) => {return v.ident === ta4.ident;});
    expect(ta4Therapeutic).toBeDefined();

    // Check only the tagged statement is present
    const therapeuticStatements = ta4Therapeutic.kbMatches[0]?.kbMatchedStatements || [];
    expect(therapeuticStatements.length).toBe(1);
    expect(therapeuticStatements[0].ident).toBe(singleKbStatementId[0]);
  });

  test('POST changes tag from therapeuticAssociation to noTable for variant and statements', async () => {
    // Find TA4 variant with two statements
    const res = await request
      .get(`/api/reports/${rapidReportIdent.ident}/variants`)
      .query({rapidTable: 'cancerRelevance'})
      .auth(username, password)
      .type('json');
    const ta4Variants = res.body.filter((variant) => {
      return variant.variantType === 'cnv' && variant.gene.name === 'TA4gene';
    });
    const [ta4] = ta4Variants;
    // Get kbMatchedStatements for TA4
    // const allStatements = ta4.kbMatches[0]?.kbMatchedStatements || [];
    const allStatements = [];
    for (const kbMatch of ta4.kbMatches || []) {
      for (const statement of kbMatch.kbMatchedStatements || []) {
        if (statement?.ident) {
          allStatements.push(statement.ident);
        }
      }
    }
    expect(allStatements.length).toBeGreaterThanOrEqual(2);
    // Tag only the first statement as therapeuticAssociation

    const singleKbStatementId = [allStatements[0]];
    await request
      .post(`/api/reports/${rapidReportIdent.ident}/variants/set-summary-table/`)
      .auth(username, password)
      .type('json')
      .send({
        variantType: ta4.variantType,
        variantIdent: ta4.ident,
        kbStatementIds: allStatements,
        annotations: {rapidReportTableTag: 'therapeuticAssociation'},
      })
      .expect(HTTP_STATUS.NO_CONTENT);

    // Check that only the tagged statement is retrieved for therapeuticAssociation
    const therapeuticsRes = await request
      .get(`/api/reports/${rapidReportIdent.ident}/variants`)
      .query({rapidTable: 'therapeuticAssociation'})
      .auth(username, password)
      .type('json')
      .expect(HTTP_STATUS.OK);
    // Find TA4 variant in response

    const table2Res = await request
      .get(`/api/reports/${rapidReportIdent.ident}/variants`)
      .query({rapidTable: 'cancerRelevance'})
      .auth(username, password)
      .type('json')
      .expect(HTTP_STATUS.OK);
    // Find TA4 variant in response

    const ta4Therapeutic = therapeuticsRes.body.find((v) => {return v.ident === ta4.ident;});
    expect(ta4Therapeutic).toBeDefined();

    // Check only the tagged statement is present
    const therapeuticStatements = ta4Therapeutic.kbMatches[0]?.kbMatchedStatements || [];
    expect(therapeuticStatements.length).toBe(1);
    expect(therapeuticStatements[0].ident).toBe(singleKbStatementId[0]);
  });

  test('POST unsets and resets tags for single therapeuticAssociation statement', async () => {
    // Find TA4 variant with two statements
    const res = await request
      .get(`/api/reports/${rapidReportIdent.ident}/variants`)
      .query({rapidTable: 'cancerRelevance'})
      .auth(username, password)
      .type('json');
    const ta4Variants = res.body.filter((variant) => {
      return variant.variantType === 'cnv' && variant.gene.name === 'TA4gene';
    });
    const [ta4] = ta4Variants;
    // Get kbMatchedStatements for TA4
    // const allStatements = ta4.kbMatches[0]?.kbMatchedStatements || [];
    const allStatements = [];
    for (const kbMatch of ta4.kbMatches || []) {
      for (const statement of kbMatch.kbMatchedStatements || []) {
        if (statement?.ident) {
          allStatements.push(statement.ident);
        }
      }
    }
    expect(allStatements.length).toBeGreaterThanOrEqual(2);
    // Tag only the first statement as therapeuticAssociation

    const singleKbStatementId = [allStatements[0]];
    await request
      .post(`/api/reports/${rapidReportIdent.ident}/variants/set-summary-table/`)
      .auth(username, password)
      .type('json')
      .send({
        variantType: ta4.variantType,
        variantIdent: ta4.ident,
        kbStatementIds: allStatements,
        annotations: {rapidReportTableTag: 'therapeuticAssociation'},
      })
      .expect(HTTP_STATUS.NO_CONTENT);

    // Check that only the tagged statement is retrieved for therapeuticAssociation
    const therapeuticsRes = await request
      .get(`/api/reports/${rapidReportIdent.ident}/variants`)
      .query({rapidTable: 'therapeuticAssociation'})
      .auth(username, password)
      .type('json')
      .expect(HTTP_STATUS.OK);
    // Find TA4 variant in response

    const table2Res = await request
      .get(`/api/reports/${rapidReportIdent.ident}/variants`)
      .query({rapidTable: 'cancerRelevance'})
      .auth(username, password)
      .type('json')
      .expect(HTTP_STATUS.OK);
    // Find TA4 variant in response

    const ta4Therapeutic = therapeuticsRes.body.find((v) => {return v.ident === ta4.ident;});
    expect(ta4Therapeutic).toBeDefined();

    // Check only the tagged statement is present
    const therapeuticStatements = ta4Therapeutic.kbMatches[0]?.kbMatchedStatements || [];
    expect(therapeuticStatements.length).toBe(1);
    expect(therapeuticStatements[0].ident).toBe(singleKbStatementId[0]);
  });
});

// tests for /set-statement-summary-table endpoint
describe('/reports/{REPORTID}/variants/set-statement-summary-table', () => {
  let rapidReportIdent;

  beforeEach(async () => {
    // Create a rapid report for each test
    let rapidTemplate = await db.models.template.findOne({where: {name: 'rapid'}});
    if (!rapidTemplate) {
      rapidTemplate = await db.models.template.create({
        name: 'rapid',
        sections: [],
      });
    }
    rapidReportIdent = await createReport(mockReportData);
  });

  afterEach(async () => {
    // Destroy the report after each test
    await db.models.report.destroy({where: {ident: rapidReportIdent.ident}});
  });

  test('POST set-statement-summary-table updates statements from no kbdata value to therapeuticAssociation', async () => {
    // Get TA3 variant and its kbMatchedStatements
    const res = await request
      .get(`/api/reports/${rapidReportIdent.ident}/variants`)
      .query({rapidTable: 'cancerRelevance'})
      .auth(username, password)
      .type('json');
    const allvars = res.body.filter((variant) => {
      return variant.variantType === 'cnv' && variant.gene.name === 'TA3gene';
    });

    const testVariant = allvars[0];
    const testKbStatementIds = [];

    for (const kbMatch of testVariant.kbMatches || []) {
      for (const statement of kbMatch.kbMatchedStatements || []) {
        expect(statement.kbData).not.toHaveProperty('rapidReportTableTag');
        if (statement?.ident) {
          testKbStatementIds.push(statement.ident);
        }
      }
    }
    const payload = {
      variantIdent: testVariant.ident,
      variantType: testVariant.variantType,
      kbStatementIds: testKbStatementIds,
      annotations: {rapidReportTableTag: 'therapeuticAssociation'},
    };
    await request
      .post(`/api/reports/${rapidReportIdent.ident}/variants/set-statement-summary-table/`)
      .auth(username, password)
      .type('json')
      .send(payload)
      .expect(HTTP_STATUS.NO_CONTENT);
    // fetch variant again and check annotation/kbMatchedStatements updated
    const res2 = await request
      .get(`/api/reports/${rapidReportIdent.ident}/variants`)
      .query({rapidTable: 'therapeuticAssociation'})
      .auth(username, password)
      .type('json')
      .expect(HTTP_STATUS.OK);
    // Check that the variant and its statements have the rapidReportTableTag
    const updatedVariant = res2.body.find((v) => {return v.ident === testVariant.ident;});
    expect(updatedVariant).toBeDefined();
    // Check kbMatchedStatements rapidReportTableTag
    const statements = updatedVariant.kbMatches.flatMap((kb) => {return kb.kbMatchedStatements;});
    statements.forEach((stmt) => {
      const tagDict = stmt.kbData?.rapidReportTableTag?.therapeuticAssociation;
      expect(tagDict).toBeDefined();
      const variantList = tagDict?.[testVariant.variantType];
      expect(Array.isArray(variantList)).toBe(true);
      expect(variantList).toContain(testVariant.ident);
    });
  });

  test('POST set-statement-summary-table updates single statement from no tag to therapeuticAssociation', async () => {
    // Get TA3 variant and its kbMatchedStatements
    const res = await request
      .get(`/api/reports/${rapidReportIdent.ident}/variants`)
      .query({rapidTable: 'cancerRelevance'})
      .auth(username, password)
      .type('json');
    const allvars = res.body.filter((variant) => {
      return variant.variantType === 'cnv' && variant.gene.name === 'TA3gene';
    });

    const testVariant = allvars[0];
    const testKbStatementIds = [];
    for (const kbMatch of testVariant.kbMatches || []) {
      for (const statement of kbMatch.kbMatchedStatements || []) {
        expect(statement.kbData).not.toHaveProperty('rapidReportTableTag');
        if (statement?.ident) {
          testKbStatementIds.push(statement.ident);
        }
      }
    }
    const testKbStatementId = testKbStatementIds[0];
    const payload = {
      variantIdent: testVariant.ident,
      variantType: testVariant.variantType,
      kbStatementIds: [testKbStatementId],
      annotations: {rapidReportTableTag: 'therapeuticAssociation'},
    };
    await request
      .post(`/api/reports/${rapidReportIdent.ident}/variants/set-summary-table/`)
      .auth(username, password)
      .type('json')
      .send(payload)
      .expect(HTTP_STATUS.NO_CONTENT);
    // fetch variant again and check annotation/kbMatchedStatements updated
    const res2 = await request
      .get(`/api/reports/${rapidReportIdent.ident}/variants`)
      .query({rapidTable: 'therapeuticAssociation'})
      .auth(username, password)
      .type('json')
      .expect(HTTP_STATUS.OK);
    // Check that the variant and its statements have the rapidReportTableTag
    const updatedVariant = res2.body.find((v) => {return v.ident === testVariant.ident;});
    expect(updatedVariant).toBeDefined();
    // Check kbMatchedStatements rapidReportTableTag
    const statements = updatedVariant.kbMatches.flatMap((kb) => {return kb.kbMatchedStatements;});
    const taggedStatement = statements.find((s) => {return s.ident === testKbStatementId;});
    const otherStatements = statements.filter((s) => {return s.ident !== testKbStatementId;});
    expect(taggedStatement.length).toBe(1);
    otherStatements.forEach((s) => {
      expect(s.kbData).not.toHaveProperty('rapidReportTableTag');
    });
    taggedStatement.forEach((stmt) => {
      const tagDict = stmt.kbData?.rapidReportTableTag?.therapeuticAssociation;
      expect(tagDict).toBeDefined();
      const variantList = tagDict?.[testVariant.variantType];
      expect(Array.isArray(variantList)).toBe(true);
      expect(variantList).toContain(testVariant.ident);
    });
  });

  test('POST set-statement-summary-table updates statements from one tag to another (therapeuticAssociation to noTable)', async () => {
    const res = await request
      .get(`/api/reports/${rapidReportIdent.ident}/variants`)
      .query({rapidTable: 'cancerRelevance'})
      .auth(username, password)
      .type('json');
    const allvars = res.body.filter((variant) => {
      return variant.variantType === 'cnv' && variant.gene.name === 'TA3gene';
    });

    const testVariant = allvars[0];
    const testKbStatementIds = [];
    for (const kbMatch of testVariant.kbMatches || []) {
      for (const statement of kbMatch.kbMatchedStatements || []) {
        expect(statement.kbData).not.toHaveProperty('rapidReportTableTag');
        if (statement?.ident) {
          testKbStatementIds.push(statement.ident);
        }
      }
    }
    const testKbStatementId = testKbStatementIds[0];
    const payload = {
      variantIdent: testVariant.ident,
      variantType: testVariant.variantType,
      kbStatementIds: testKbStatementIds,
      annotations: {rapidReportTableTag: 'therapeuticAssociation'},
    };
    await request
      .post(`/api/reports/${rapidReportIdent.ident}/variants/set-summary-table/`)
      .auth(username, password)
      .type('json')
      .send(payload)
      .expect(HTTP_STATUS.NO_CONTENT);
    // fetch variant again and check annotation/kbMatchedStatements updated
    const res2 = await request
      .get(`/api/reports/${rapidReportIdent.ident}/variants`)
      .query({rapidTable: 'therapeuticAssociation'})
      .auth(username, password)
      .type('json')
      .expect(HTTP_STATUS.OK);
    // Check that the variant and its statements have the rapidReportTableTag
    const updatedVariant = res2.body.find((v) => {return v.ident === testVariant.ident;});
    expect(updatedVariant).toBeDefined();
    // Check kbMatchedStatements rapidReportTableTag
    const statements = updatedVariant.kbMatches.flatMap((kb) => {return kb.kbMatchedStatements;});
    const taggedStatement = statements.find((s) => {return s.ident === testKbStatementId;});
    const otherStatements = statements.filter((s) => {return s.ident !== testKbStatementId;});
    expect(taggedStatement.length).toBe(1);
    otherStatements.forEach((s) => {
      expect(s.kbData).not.toHaveProperty('rapidReportTableTag');
    });
    taggedStatement.forEach((stmt) => {
      const tagDict = stmt.kbData?.rapidReportTableTag?.therapeuticAssociation;
      expect(tagDict).toBeDefined();
      const variantList = tagDict?.[testVariant.variantType];
      expect(Array.isArray(variantList)).toBe(true);
      expect(variantList).toContain(testVariant.ident);
    });
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
