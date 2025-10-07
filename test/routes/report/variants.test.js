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
          annotations: {rapidReportTableTag: 'therapeuticAssociation'},
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

async function fetchVariants({reportId, geneName, table = 'cancerRelevance', variantType = 'cnv'}) {
  const res = await request
    .get(`/api/reports/${reportId}/variants`)
    .query({rapidTable: table})
    .auth(username, password)
    .type('json');

  return res.body.filter((v) => {return v.variantType === variantType && v.gene.name === geneName;});
}

async function updateVariantTags(reportId, testVariant, stmtIds, tableTag) {
  const payload = {
    variantIdent: testVariant.ident,
    variantType: testVariant.variantType,
    kbStatementIds: stmtIds,
    rapidReportTableTag: tableTag,
  };
  await request
    .post(`/api/reports/${reportId}/variants/set-summary-table/`)
    .auth(username, password)
    .type('json')
    .send(payload)
    .expect(HTTP_STATUS.NO_CONTENT);
}

async function updateStatementTags(reportId, testVariant, stmtIds, tableTag) {
  const payload = {
    variantIdent: testVariant.ident,
    variantType: testVariant.variantType,
    kbStatementIds: stmtIds,
    rapidReportTableTag: tableTag,
  };
  await request
    .post(`/api/reports/${reportId}/variants/set-statement-summary-table/`)
    .auth(username, password)
    .type('json')
    .send(payload)
    .expect(HTTP_STATUS.NO_CONTENT);
}

async function fetchStatements(reportId) {
  const res = await request
    .get(`/api/reports/${reportId}/kb-matches/kb-matched-statements`)
    .auth(username, password)
    .type('json')
    .expect(HTTP_STATUS.OK);

  return res.body;
}

function assertTagPresence(statements, tag, variantType, variantIdent, shouldContain = true) {
  statements.forEach((stmt) => {
    const tagDict = stmt.kbData?.rapidReportTableTag?.[tag];
    expect(tagDict).toBeDefined();
    const variantList = tagDict?.[variantType] || [];
    expect(Array.isArray(variantList)).toBe(true);

    if (shouldContain) {
      expect(variantList).toContain(variantIdent);
    } else {
      expect(variantList).not.toContain(variantIdent);
    }
  });
}

// New tests for /set-summary-table endpoint
describe('/reports/{REPORTID}/variants/set-summary-table', () => {
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

  test('POST sets summary table tags for variant and statements', async () => {
    // Get TA3 variant and its kbMatchedStatements
    const [testVariant] = await fetchVariants({
      reportId: rapidReportIdent.ident,
      geneName: 'TA3gene',
    });
    const stmtIds = [];
    for (const kbMatch of testVariant.kbMatches || []) {
      for (const statement of kbMatch.kbMatchedStatements || []) {
        if (statement?.ident) {
          stmtIds.push(statement.ident);
        }
      }
    }
    await updateVariantTags(rapidReportIdent.ident, testVariant, stmtIds, 'therapeuticAssociation');

    // fetch variant again and check annotation/kbMatchedStatements updated
    const [postUpdateVariant] = await fetchVariants({
      reportId: rapidReportIdent.ident,
      geneName: 'TA3gene',
      table: 'therapeuticAssociation',
    });
    // Check that the variant and its statements now have the rapidReportTableTag
    expect(postUpdateVariant.ident).toBe(testVariant.ident);
    expect(postUpdateVariant).toBeDefined();
    const statements = postUpdateVariant.kbMatches.flatMap((kb) => {return kb.kbMatchedStatements;});
    assertTagPresence(statements, 'therapeuticAssociation', testVariant.variantType, testVariant.ident);
  });

  test('POST changes existing tags for variant and statements', async () => {
    // Find TA3 variant with two statements

    const [testVariant] = await fetchVariants({
      reportId: rapidReportIdent.ident,
      geneName: 'TA3gene',
      table: 'cancerRelevance',
    });
    // Get kbMatchedStatements for TA3
    const stmtIds = [];
    for (const kbMatch of testVariant.kbMatches || []) {
      for (const statement of kbMatch.kbMatchedStatements || []) {
        if (statement?.ident) {
          stmtIds.push(statement.ident);
        }
      }
    }
    expect(stmtIds.length).toBeGreaterThanOrEqual(2);

    // Tag variant and stmts as therapeuticAssociation
    await updateVariantTags(rapidReportIdent.ident, testVariant, stmtIds, 'therapeuticAssociation');

    // fetch variant again and check annotation/kbMatchedStatements set
    const [postUpdateVariant] = await fetchVariants({
      reportId: rapidReportIdent.ident,
      geneName: 'TA3gene',
      table: 'therapeuticAssociation',
    });
    expect(postUpdateVariant).toBeDefined();
    expect(postUpdateVariant.ident).toBe(testVariant.ident);
    const therapeuticStatements = postUpdateVariant.kbMatches.flatMap((kb) => {return kb.kbMatchedStatements;});
    expect(therapeuticStatements.length).toBe(3); // #23 from two diff kbmatches; #25 from another kbmatch

    // Update variant and statements to unknownSignificance
    await updateVariantTags(rapidReportIdent.ident, testVariant, stmtIds, 'unknownSignificance');

    // fetch variant again and check annotation/kbMatchedStatements updated
    const [postUpdateVariant2] = await fetchVariants({
      reportId: rapidReportIdent.ident,
      geneName: 'TA3gene',
      table: 'unknownSignificance',
    });
    expect(postUpdateVariant2).toBeDefined();
    expect(postUpdateVariant2.ident).toBe(testVariant.ident);

    // Check that the expected statement tags have been updated
    const statements = postUpdateVariant2.kbMatches.flatMap((kb) => {return kb.kbMatchedStatements;});
    assertTagPresence(statements, 'unknownSignificance', testVariant.variantType, testVariant.ident);
    assertTagPresence(statements, 'therapeuticAssociation', testVariant.variantType, testVariant.ident, false);
  });

  test('POST fails with malformed input', async () => {
    // Get TA3 variant and its kbMatchedStatements

    const [testVariant] = await fetchVariants({
      reportId: rapidReportIdent.ident,
      geneName: 'TA3gene',
      table: 'cancerRelevance',
    });
    const testKbStatementIds = [];
    for (const kbMatch of testVariant.kbMatches || []) {
      for (const statement of kbMatch.kbMatchedStatements || []) {
        expect(statement.kbData).toBe(null);
        if (statement?.ident) {
          testKbStatementIds.push(statement.ident);
        }
      }
    }
    let payload = {};

    await request
      .post(`/api/reports/${rapidReportIdent.ident}/variants/set-summary-table/`)
      .auth(username, password)
      .type('json')
      .send(payload)
      .expect(HTTP_STATUS.BAD_REQUEST);

    payload = {variantType: 'fake', variantIdent: 'also fake'};

    await request
      .post(`/api/reports/${rapidReportIdent.ident}/variants/set-summary-table/`)
      .auth(username, password)
      .type('json')
      .send(payload)
      .expect(HTTP_STATUS.BAD_REQUEST);

    payload = {variantType: 'cnv', variantIdent: testVariant.ident, rapidReportTableTag: 'test'};

    await request
      .post(`/api/reports/${rapidReportIdent.ident}/variants/set-summary-table/`)
      .auth(username, password)
      .type('json')
      .send(payload)
      .expect(HTTP_STATUS.BAD_REQUEST);

    payload = {variantType: 'cnv', variantIdent: testVariant.ident, kbStatementIds: ['hello', 'world']};

    await request
      .post(`/api/reports/${rapidReportIdent.ident}/variants/set-summary-table/`)
      .auth(username, password)
      .type('json')
      .send(payload)
      .expect(HTTP_STATUS.BAD_REQUEST);
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

  test('POST updates statements from no kbdata value to therapeuticAssociation', async () => {
    // Get TA3 variant and its kbMatchedStatements
    const [testVariant] = await fetchVariants({
      reportId: rapidReportIdent.ident,
      geneName: 'TA3gene',
    });
    const stmtIds = [];

    // check all statements start with uninitialized kbdata; get their idents
    for (const kbMatch of testVariant.kbMatches || []) {
      for (const statement of kbMatch.kbMatchedStatements || []) {
        expect(statement.kbData).toBe(null);
        if (statement?.ident) {
          stmtIds.push(statement.ident);
        }
      }
    }

    // send the tag update
    await updateStatementTags(rapidReportIdent.ident, testVariant, stmtIds, 'therapeuticAssociation');

    // fetch variant again and check stmt tags are updated
    const postUpdateStatements = await fetchStatements(rapidReportIdent.ident);

    // Check that the variant and the specified statements have the rapidReportTableTag
    const updatedVariants = postUpdateStatements.filter((v) => {return stmtIds.includes(v.ident);});
    expect(updatedVariants).toBeDefined();
    expect(updatedVariants.length).toBe(stmtIds.length);
    assertTagPresence(updatedVariants, 'therapeuticAssociation', testVariant.variantType, testVariant.ident);

    // check that not every statement was tagged
    const notUpdatedVariants = postUpdateStatements.filter((v) => {return !(stmtIds.includes(v.ident));});
    expect(notUpdatedVariants.length).toBeGreaterThanOrEqual(1);
    notUpdatedVariants.forEach((stmt) => {
      expect(stmt.kbData).toBe(null);
    });
  });

  test('POST updates single statement from no tag to therapeuticAssociation', async () => {
    // Get TA3 variant and its kbMatchedStatements
    const [testVariant] = await fetchVariants({
      reportId: rapidReportIdent.ident,
      geneName: 'TA3gene',
    });
    const stmtIds = [];

    // check all statements start with uninitialized kbdata; get their idents
    for (const kbMatch of testVariant.kbMatches || []) {
      for (const statement of kbMatch.kbMatchedStatements || []) {
        expect(statement.kbData).toBe(null);
        if (statement?.ident) {
          stmtIds.push(statement.ident);
        }
      }
    }
    const stmtId = stmtIds[0];
    // send the tag update
    await updateStatementTags(rapidReportIdent.ident, testVariant, [stmtId], 'therapeuticAssociation');

    // fetch variant again and check stmt tags are updated
    const postUpdateStatements = await fetchStatements(rapidReportIdent.ident);

    const updatedVariants = postUpdateStatements.filter((v) => {return stmtId === v.ident;});
    expect(updatedVariants.length).toBe(1);
    assertTagPresence(updatedVariants, 'therapeuticAssociation', testVariant.variantType, testVariant.ident);

    const notUpdatedVariants = postUpdateStatements.filter((v) => {return !(stmtIds.includes(v.ident));});
    expect(notUpdatedVariants.length).toBeGreaterThanOrEqual(1);
    notUpdatedVariants.forEach((stmt) => {
      expect(stmt.kbData).toBe(null);
    });
  });

  test('POST updates statements from one tag to another (therapeuticAssociation to noTable)', async () => {
    // Get TA3 variant and its kbMatchedStatements
    const [testVariant] = await fetchVariants({
      reportId: rapidReportIdent.ident,
      geneName: 'TA3gene',
    });

    const testKbStatementIds = [];
    for (const kbMatch of testVariant.kbMatches || []) {
      for (const statement of kbMatch.kbMatchedStatements || []) {
        expect(statement.kbData).toBe(null);
        if (statement?.ident) {
          testKbStatementIds.push(statement.ident);
        }
      }
    }
    const stmtId = testKbStatementIds[0];

    // tag it with first tag: therapeuticAssoc
    await updateStatementTags(rapidReportIdent.ident, testVariant, [stmtId], 'therapeuticAssociation');

    // fetch kb statement again and check that it has a rapid report table tag of TA
    const postUpdateStatements1 = await fetchStatements(rapidReportIdent.ident);
    const updatedVariants = postUpdateStatements1.filter((v) => {return stmtId === v.ident;});
    expect(updatedVariants.length).toBe(1);
    assertTagPresence(updatedVariants, 'therapeuticAssociation', testVariant.variantType, testVariant.ident);

    // Now change tag to noTable
    await updateStatementTags(rapidReportIdent.ident, testVariant, [stmtId], 'noTable');

    // fetch variant again and check that its tag has been updated
    const postUpdateStatements2 = await fetchStatements(rapidReportIdent.ident);
    const updatedVariants2 = postUpdateStatements2.filter((v) => {return stmtId === v.ident;});
    expect(updatedVariants2.length).toBe(1);

    // first tag gone:
    assertTagPresence(updatedVariants2, 'therapeuticAssociation', testVariant.variantType, testVariant.ident, false);

    // second tag present:
    assertTagPresence(updatedVariants2, 'noTable', testVariant.variantType, testVariant.ident);

    // no other statements tagged:
    const notUpdatedVariants = postUpdateStatements2.filter((v) => {return !(stmtId === v.ident);});
    expect(notUpdatedVariants.length).toBeGreaterThanOrEqual(1);
    notUpdatedVariants.forEach((stmt) => {
      expect(stmt.kbData).toBe(null);
    });
  });

  test('POST fails with malformed input', async () => {
    // Get TA3 variant and its kbMatchedStatements

    const [testVariant] = await fetchVariants({
      reportId: rapidReportIdent.ident,
      geneName: 'TA3gene',
      table: 'cancerRelevance',
    });
    const testKbStatementIds = [];
    for (const kbMatch of testVariant.kbMatches || []) {
      for (const statement of kbMatch.kbMatchedStatements || []) {
        expect(statement.kbData).toBe(null);
        if (statement?.ident) {
          testKbStatementIds.push(statement.ident);
        }
      }
    }
    let payload = {};

    await request
      .post(`/api/reports/${rapidReportIdent.ident}/variants/set-statement-summary-table/`)
      .auth(username, password)
      .type('json')
      .send(payload)
      .expect(HTTP_STATUS.BAD_REQUEST);

    payload = {variantType: 'fake', variantIdent: 'also fake'};

    await request
      .post(`/api/reports/${rapidReportIdent.ident}/variants/set-statement-summary-table/`)
      .auth(username, password)
      .type('json')
      .send(payload)
      .expect(HTTP_STATUS.BAD_REQUEST);

    payload = {variantType: 'cnv', variantIdent: testVariant.ident, rapidReportTableTag: 'test'};

    await request
      .post(`/api/reports/${rapidReportIdent.ident}/variants/set-statement-summary-table/`)
      .auth(username, password)
      .type('json')
      .send(payload)
      .expect(HTTP_STATUS.BAD_REQUEST);

    payload = {variantType: 'cnv', variantIdent: testVariant.ident, kbStatementIds: ['hello', 'world']};

    await request
      .post(`/api/reports/${rapidReportIdent.ident}/variants/set-statement-summary-table/`)
      .auth(username, password)
      .type('json')
      .send(payload)
      .expect(HTTP_STATUS.BAD_REQUEST);
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
