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

  // FOR CLARITY IN READING THE KB TESTS:
  // kbStatementId - the graphkb id of a statement; not guaranteed to be unique in ipr
  // kbMatchedStatementId or kbStatement.id - the unique ipr id of a statement record
  // kbVariantId - the graphkb id of a variant; not guaranteed to be unique in ipr
  // kbMatchId or kbMatch.id- the unique ipr id of a matched variant record
  // (the ipr records contain the graphkb ids)
  //
  // variantId - a column in the kbMatch table. the ipr id of the record of for
  // the observed variant, details of which are stored in a different ipr table;
  // specifically which table depends on what type of variant it is.
  //

  test('kbStatements and kbVariants are all linked via kbJoins', async () => {
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

  test('Old-format kbmatch input yields 1-1-1 stmt-join-variant set', async () => {
    // expect backwards-compatible input format to create one variant-join-statement
    const stmts = kbStatements.filter((stmt) => {
      return stmt.kbStatementId === '#backwardscompatible1';
    });
    const stmtIds = stmts.map((item) => {return item.dataValues.id;});
    const joins = kbJoins.filter((item) => {
      return stmtIds.includes(item.kbMatchedStatementId);
    });
    const joinIds = joins.map((item) => {return item.kbMatchId;});
    const vars = kbVariants.filter((item) => {return joinIds.includes(item.id);});
    expect(stmts.length).toBe(1);
    expect(vars.length).toBe(1);
    expect(joins.length).toBe(1);
    expect(vars[0].kbVariantId).toBe('#backwardscompatible1-variant');
  });

  test('Single-variant statement with single condition set yields 1-1-1 stmt-join-variant set', async () => {
    // expect new format to create single stmt-join-var set in simplest case
    // (single variant stmt, one conditionset)
    const stmts = kbStatements.filter((kbs) => {
      return kbs.kbStatementId === '#singlevariantstmt_singleconditionset';
    });
    const stmtIds = stmts.map((item) => {return item.dataValues.id;});
    const joins = kbJoins.filter((item) => {
      return stmtIds.includes(item.kbMatchedStatementId);
    });
    const joinIds = joins.map((item) => {return item.kbMatchId;});
    const vars = kbVariants.filter((item) => {return joinIds.includes(item.id);});
    expect(stmts.length).toBe(1);
    expect(vars.length).toBe(1);
    expect(joins.length).toBe(1);
    expect(vars[0].kbVariantId).toBe('#333:333');
  });

  test('Single-variant statement with two condition sets yields 2 stmts each with 1-1 join-variant pair', async () => {
    // expect new format to create two stmts (and each to have one var, one join)
    // for single variant stmt with two conditionsets
    const stmts = kbStatements.filter((kbs) => {
      return kbs.kbStatementId === '#singlevariantstmt_multiconditionset';
    });
    expect(stmts.length).toBe(2);
    const allAssociatedVars = [];
    stmts.forEach((stmt) => {
      const joins = kbJoins.filter((item) => {return stmt.id === item.kbMatchedStatementId;});
      const vars = kbVariants.filter((item) => {return item.id === joins[0].kbMatchId;});
      expect(vars.length).toBe(1);
      expect(joins.length).toBe(1);
      expect(vars[0].kbVariantId).toBe('#111:111'); // expect the vars to have the same graphkb id
      allAssociatedVars.push(vars[0]);
    });
    // expect the vars to have different ipr ids (to be two distinct records)
    expect(allAssociatedVars[0].variantId).not.toEqual(allAssociatedVars[1].variantId);
  });

  test('Multi-variant statement with one condition sets yields 1 stmt with two 1-1 join-variant pairs', async () => {
    // expect new format to create two joins, two vars, one stmt
    // for multivariant stmt with one conditionset
    const stmts = kbStatements.filter((kbs) => {
      return kbs.kbStatementId === '#multivariantstmt_singleconditionset';
    });
    const stmtIds = stmts.map((item) => {return item.dataValues.id;});
    const joins = kbJoins.filter((item) => {
      return stmtIds.includes(item.kbMatchedStatementId);
    });
    const joinIds = joins.map((item) => {return item.kbMatchId;});
    const vars = kbVariants.filter((item) => {return joinIds.includes(item.id);});
    expect(stmts.length).toBe(1);
    expect(vars.length).toBe(2);
    expect(joins.length).toBe(2);
    // expect the vars to have different ipr ids (to be two distinct records)
    expect(vars[0].id).not.toEqual(vars[1].id);
  });

  test('Multi-variant statement with two condition sets yields 2 stmts each with two 1-1 join-variant pairs', async () => {
    // for multivariant stmt with two conditionsets:
    // expect new format to create two stmts;
    // expect each statement to have two joins;
    // expect the four joins to reference only three total variants -
    // one variant which is used in both conditionsets,
    // while the other condition is met by two different variants
    const stmts = kbStatements.filter((kbs) => {
      return kbs.kbStatementId === '#multivariantstmt_multiconditionset';
    });
    expect(stmts.length).toBe(2);
    const allAssociatedVars = [];
    stmts.forEach((stmt) => {
      const joins = kbJoins.filter((item) => {return stmt.id === item.kbMatchedStatementId;});
      const joinIds = joins.map((item) => {return item.kbMatchId;});
      const vars = kbVariants.filter((item) => {return joinIds.includes(item.id);});
      expect(joins.length).toBe(2);
      expect(vars.length).toBe(2);
      allAssociatedVars.push(...vars);
    });
    // get list of unique variant records by id.
    // expect 3 total, one option for condition 1, two options for condition 2 - see input data
    const uniqueVarIds = new Set(allAssociatedVars.map((item) => {return item.id;}));
    expect(uniqueVarIds.size).toBe(3);
  });

  test('Distinct stmts created for stmt referenced in both old and new formats', async () => {
    // basically, this tests conversion of old format to new format
    // after which this situation should be handled like
    // a single-variant-stmt with two condition sets
    const stmts = kbStatements.filter(
      (kbs) => {return kbs.kbStatementId === '#backwardscompatible2';},
    );
    expect(stmts.length).toBe(2);
    const associatedVars = [];
    stmts.forEach((stmt) => {
      const join = kbJoins.filter((item) => {return stmt.id === item.kbMatchedStatementId;});
      const vars = kbVariants.filter((item) => {return item.id === join[0].kbMatchId;});
      expect(join.length).toBe(1);
      expect(vars.length).toBe(1);
      expect(vars[0].kbVariantId).toBe('#backwardscompatible2-variant');
      associatedVars.push(...vars);
    });
    // make sure the two stmt-join-var sets are to the two different variants in the input data:
    expect(associatedVars[0].variantId).not.toEqual(associatedVars[1].variantId);
  });

  afterAll(async () => {
    // Delete newly created report and all of it's components
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
