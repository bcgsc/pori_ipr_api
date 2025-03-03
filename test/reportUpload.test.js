const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../app/models');

const mockReportData = require('./testData/mockReportData.json');

const CONFIG = require('../app/config');
const {listen} = require('../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

const LONGER_TIMEOUT = 100000;

let server;
let request;

const getVarsForStatement = (kbStmtId, kbStatements, kbVariants, kbJoins) => {
  const stmts = kbStatements.filter((kbs) => {
    return kbs.kbStatementId === kbStmtId;
  });
  const allAssociatedVars = [];
  stmts.forEach((stmt) => {
    const joins = kbJoins.filter((item) => {return stmt.id === item.kbMatchedStatementId;});
    const varIds = joins.map((item) => {return item.kbMatchId;});
    const vars = kbVariants.filter((item) => {return varIds.includes(item.id);});
    allAssociatedVars.push(vars);
  });
  return allAssociatedVars;
};

const getVariantKeyValue = (kbMatch, allVars, variantKey) => {
  const variant = allVars[kbMatch.variantType].filter((item) => {
    return item.dataValues.id === kbMatch.dataValues.variantId;
  });
  expect(variant.length).toBe(1);

  const retval = variant[0][variantKey];
  return retval;
};

const checkForConditionSetMatch = (varLists, conditionList, allVars) => {
  /* ConditionList is a group of observed variant/kbVariant pairs.
  varLists is a list of such groups.
  This function checks that conditionList matches some element of varlists -
  ie it checks whether each observed variant/kbvariant pair in the conditionList,
  is present in the varList element, and vice versa.
  */
  for (const group of varLists) {
    // check every variant in the condition list has a match in the group
    const conditionMatched = conditionList.every((conditionVariant) => {
      return group.some((groupVariant) => {
        return groupVariant.kbStatementId === conditionVariant.kbStatementId
            && getVariantKeyValue(groupVariant, allVars, conditionVariant.variantKey)
            === conditionVariant.variantKeyValue;
      });
    });

    // check every variant in the group has a match in the condition list
    const groupMatched = group.every((groupVariant) => {
      return conditionList.some((conditionVariant) => {
        return conditionVariant.kbStatementId === groupVariant.kbStatementId
            && conditionVariant.variantKeyValue
            === getVariantKeyValue(groupVariant, allVars, conditionVariant.variantKey);
      });
    });

    if (conditionMatched && groupMatched) {
      return true;
    }
  }
  return false;
};

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

// Tests for uploading a report and all of its components
describe('Tests for uploading a report and all of its components', () => {
  let reportId;
  let reportIdent;
  let kbStatements;
  let kbVariants;
  let kbJoins;
  const allVars = {};

  beforeAll(async () => {
    // Assure projects exists before creating report
    await db.models.project.findOrCreate({
      where: {
        name: 'TEST',
      },
    });

    await db.models.project.findOrCreate({
      where: {
        name: 'TEST2',
      },
    });

    // create report
    let res = await request
      .post('/api/reports')
      .auth(username, password)
      .send(mockReportData)
      .type('json')
      .expect(HTTP_STATUS.CREATED);
    expect(typeof res.body).toBe('object');

    reportIdent = res.body.ident;

    // check that the report was created
    res = await request
      .get(`/api/reports/${reportIdent}`)
      .auth(username, password)
      .type('json')
      .expect(HTTP_STATUS.OK);

    // get report id from doing a db find because it's not returned by the API
    const result = await db.models.report.findOne({where: {ident: reportIdent}, attributes: ['id']});
    reportId = result.id;

    kbStatements = await db.models.kbMatchedStatements.findAll({where: {report_id: reportId}});
    kbVariants = await db.models.kbMatches.findAll({where: {report_id: reportId}});

    // there are other types of mutations, but these are the ones used in these tests so far
    allVars.mut = await db.models.smallMutations.findAll({where: {report_id: reportId}});
    allVars.exp = await db.models.expressionVariants.findAll({where: {report_id: reportId}});
    allVars.tmb = await db.models.tmburMutationBurden.findAll({where: {report_id: reportId}});
    allVars.sigv = await db.models.signatureVariants.findAll({where: {report_id: reportId}});

    const kbstmtids = kbStatements.map((obj) => {return obj.id;});
    kbJoins = await db.models.kbMatchJoin.findAll({where: {kbMatchedStatementId: kbstmtids}});
  }, LONGER_TIMEOUT);

  // Test that all components were created
  test('All components were created correctly', async () => {
    // for all components, do a find where report_id
    // is the same as the created report id
    const {
      ReportUserFilter, createdBy, template, signatures,
      presentationDiscussion, presentationSlides,
      users, projects, ...associations
    } = db.models.report.associations;

    const promises = [];
    // verify all report components were created
    Object.values(associations).forEach(async (association) => {
      const model = association.target.name;
      promises.push(db.models[model].findAll({where: {reportId}}));
    });

    const components = await Promise.all(promises);

    // results should be a non-empty array
    components.forEach((component) => {
      expect(Array.isArray(component)).toBe(true);
      expect(component.length).toBeGreaterThan(0);
    });
  }, LONGER_TIMEOUT);

  test('Genes entries were created correctly from variant and gene rows', async () => {
    const genes = await db.models.genes.findAll({where: {reportId}});
    expect(genes).toHaveProperty('length', 5);

    // gene flags should be added from genes section if given
    expect(genes).toEqual(expect.arrayContaining([expect.objectContaining({
      name: 'ZFP36L2',
      oncogene: true,
    })]));
  });

  test('Template was linked correctly', async () => {
    // Get Report and test that the template data in the report is correct
    const report = await db.models.report.findOne({where: {id: reportId}, attributes: ['templateId']});
    const template = await db.models.template.findOne({where: {name: 'genomic'}, attributes: ['id']});

    expect(template.id).toBe(report.templateId);
  });

  test('Creating user was linked correctly', async () => {
    // Get Report and test that the template data in the report is correct
    const report = await db.models.report.findOne({where: {id: reportId}, attributes: ['createdBy_id']});
    const boundUser = await db.models.reportUser.findOne({where: {report_id: reportId}});

    expect(boundUser).not.toBeNull();
    expect(boundUser.deletedAt).toBeNull();
    expect(boundUser.role).toBe('bioinformatician');
    expect(boundUser.user_id).toBe(report.createdBy_id);
  });

  test('No kbStatements or kbVariants are unlinked', async () => {
    const kbstmtids = kbStatements.map((obj) => {return obj.id;}); // the ipr statement record ids
    const kbvarids = kbVariants.map((obj) => {return obj.id;}); // the ipr variant record ids

    // assert there are no un-linked variants or statements
    kbvarids.forEach((kbv) => {
      expect(kbJoins.map((item) => {return item.kbMatchId;}).includes(kbv)).toBe(true);
    });
    kbstmtids.forEach((kbs) => {
      expect(kbJoins.map((item) => {return item.kbMatchedStatementId;}).includes(kbs)).toBe(true);
    });
  });

  test('One statement record created for each input condition set', async () => {
    const conditionsets = mockReportData.kbStatementMatchedConditions;
    const oldFormatConditionSets = mockReportData.kbMatches.filter((item) => {return 'kbStatementId' in item;});

    const totalExpectedStatements = conditionsets.length + oldFormatConditionSets.length;
    expect(totalExpectedStatements).toEqual(kbStatements.length);
  });

  test('One variant record created for each input kbmatch record', async () => {
    const variants = mockReportData.kbMatches;
    expect(variants.length).toEqual(kbVariants.length);
  });

  test('Old-format kbmatch input yields 1-1 stmt-variant set', async () => {
    // expect backwards-compatible input format to create one stmt with one associated variant
    const vars = getVarsForStatement('#backwardscompatible1', kbStatements, kbVariants, kbJoins);
    expect(vars.length).toBe(1); // expect one statement to have been created
    const conditionSet1 = [
      {kbVariantId: '#backwardscompatible1-variant', variantKey: 'displayName', variantKeyValue: 'Signature Variant'},
    ];
    expect(checkForConditionSetMatch(vars, conditionSet1, allVars)).toBe(true);
  });

  test('Single-variant statement with single condition set yields 1-1 stmt-variant set', async () => {
    const vars = getVarsForStatement('#singlevariantstmt_singleconditionset', kbStatements, kbVariants, kbJoins);
    expect(vars.length).toBe(1); // expect one statement to have been created
    const conditionSet1 = [
      {kbVariantId: '#333:333', variantKey: 'adjustedTmbComment', variantKeyValue: 'tmb-test'},
    ];
    expect(checkForConditionSetMatch(vars, conditionSet1, allVars)).toBe(true);
  });

  test('Single-variant statement with two condition sets yields 2 stmts each with 1 variant', async () => {
    const varLists = getVarsForStatement('#singlevariantstmt_multiconditionset', kbStatements, kbVariants, kbJoins);
    expect(varLists.length).toBe(2);
    const conditionSet1 = [
      {kbVariantId: '#111:111', variantKey: 'hgvsProtein', variantKeyValue: 'ZFP36L2:p.Q111del-test1'},
    ];
    expect(checkForConditionSetMatch(varLists, conditionSet1, allVars)).toBe(true);
    const conditionSet2 = [
      {kbVariantId: '#111:111', variantKey: 'hgvsProtein', variantKeyValue: 'ZFP36L2:p.Q999del-test2'},
    ];
    expect(checkForConditionSetMatch(varLists, conditionSet2, allVars)).toBe(true);
  });

  test('Multi-variant statement with one condition set yields 1 stmt with 2 variants', async () => {
    const varLists = getVarsForStatement('#multivariantstmt_singleconditionset', kbStatements, kbVariants, kbJoins);
    expect(varLists.length).toBe(1);
    const conditionSet1 = [
      {kbVariantId: '#333:333', variantKey: 'adjustedTmbComment', variantKeyValue: 'tmb-test'},
      {kbVariantId: '#111:111', variantKey: 'hgvsProtein', variantKeyValue: 'ZFP36L2:p.Q111del-test1'},
    ];
    expect(checkForConditionSetMatch(varLists, conditionSet1, allVars)).toBe(true);
  });

  test('Multi-variant statement with two condition sets yields 2 stmts each with two 2 variants', async () => {
    const varLists = getVarsForStatement('#multivariantstmt_multiconditionset', kbStatements, kbVariants, kbJoins);
    expect(varLists.length).toBe(2);
    const conditionSet1 = [
      {kbVariantId: '#333:333', variantKey: 'adjustedTmbComment', variantKeyValue: 'tmb-test'},
      {kbVariantId: '#111:111', variantKey: 'hgvsProtein', variantKeyValue: 'ZFP36L2:p.Q111del-test1'},
    ];
    expect(checkForConditionSetMatch(varLists, conditionSet1, allVars)).toBe(true);
    const conditionSet2 = [
      {kbVariantId: '#333:333', variantKey: 'adjustedTmbComment', variantKeyValue: 'tmb-test'},
      {kbVariantId: '#111:111', variantKey: 'hgvsProtein', variantKeyValue: 'ZFP36L2:p.Q999del-test2'},
    ];
    expect(checkForConditionSetMatch(varLists, conditionSet2, allVars)).toBe(true);
  });

  test('Distinct stmts are created for stmt referenced in both old and new formats', async () => {
    // this tests conversion of old format to new format after which
    // this situation should be handled like a single-variant-stmt with two condition sets
    const varLists = getVarsForStatement('#backwardscompatible2', kbStatements, kbVariants, kbJoins);
    expect(varLists.length).toBe(2);
    const conditionSet1 = [
      {kbVariantId: '#backwardscompatible2-variant', variantKey: 'hgvsProtein', variantKeyValue: 'ZFP36L2:p.Q111del-test1'},
    ];
    expect(checkForConditionSetMatch(varLists, conditionSet1, allVars)).toBe(true);

    const conditionSet2 = [
      {kbVariantId: '#backwardscompatible2-variant', variantKey: 'location', variantKeyValue: '11:65265233-65273940'},
    ];
    expect(checkForConditionSetMatch(varLists, conditionSet2, allVars)).toBe(true);
  });

  afterAll(async () => {
    // Delete newly created report and all of its components
    // by force deleting the report
    return db.models.report.destroy({where: {id: reportId}});
  });
});

// Tests for uploading a report and all of its components
describe('Tests for uploading a report', () => {
  test('Upload fails on empty image data', async () => {
    // create report
    const emptyImageMockReportData = JSON.parse(JSON.stringify(mockReportData));
    emptyImageMockReportData.images[0].path = 'test/testData/images/empty_image.png';
    const res = await request
      .post('/api/reports')
      .auth(username, password)
      .send(emptyImageMockReportData)
      .type('json')
      .expect(HTTP_STATUS.BAD_REQUEST);

    expect(typeof res.body).toBe('object');
  }, LONGER_TIMEOUT);

  test('Upload works when no sampleInfo', async () => {
    // create report
    const mockReportNoSampleInfo = JSON.parse(JSON.stringify(mockReportData));
    delete mockReportNoSampleInfo.sampleInfo;

    await request
      .post('/api/reports')
      .auth(username, password)
      .send(mockReportNoSampleInfo)
      .type('json')
      .expect(HTTP_STATUS.CREATED);
  }, LONGER_TIMEOUT);
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
