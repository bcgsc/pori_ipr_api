const HTTP_STATUS = require('http-status-codes');

const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../../../app/models');

const mockReportData = require('../../testData/mockRapidReportData.json');
const createReport = require('../../../app/libs/createReport');

const router = require('../../../app/routes/report/variants');

const {checkKbDataSummaryTableTag, updateKbDataSummaryTableTag} = router._testUtils;

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

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

/**
 * Checks which rapid report table a variant will appear in
 *
 * @param {string} reportId - The ID of the report to check.
 * @param {string} variantDisplayName - The display name of the variant.
 * @param {string} variantType - The type of the variant to check.
 * @returns {Promise<string>} - The name of the table found or 'noTable'.
 */
async function checkRapidReportTable(reportId, variantDisplayName, variantType) {
  const tablenames = ['therapeuticAssociation', 'cancerRelevance', 'unknownSignificance'];
  const tablesFoundIn = [];
  for (const tablename of tablenames) {
    const res = await request
      .get(`/api/reports/${reportId}/variants`)
      .query({rapidTable: tablename})
      .auth(username, password)
      .type('json');

    const variants = res.body.filter((variant) => {return variant.variantType === variantType;});
    const variantNames = variants.map((variant) => {return variant.displayName;});
    if (variantNames.includes(variantDisplayName)) {
      tablesFoundIn.push(tablename);
    }
  }
  expect(tablesFoundIn.length).toBeLessThan(2);
  if (tablesFoundIn.length === 0) {
    return 'noTable';
  }
  return tablesFoundIn[0];
}

// Tests for /variantss endpoint
describe('/reports/{REPORTID}/variants', () => {
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
  });

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

    test('IPR-A, disease match, and passed mutation regex check put sensitivity therapeutic match in table 1 - OK', async () => {
      // create report
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([{
        category: 'therapeutic',
        variantType: 'mut',
        variant: 'TA4',
        iprEvidenceLevel: 'IPR-A',
        kbVariant: 'TA4 specific variant',
        matchedCancer: true,
        relevance: 'sensitivity',
        kbVariantId: '#33',
        kbStatementId: '#33',
      }]);
      newMockReportData.genes = newMockReportData.genes.concat([{name: 'TA4gene'}]);
      newMockReportData.smallMutations = newMockReportData.smallMutations.concat([{
        gene: 'TA4gene',
        key: 'TA4',
        displayName: 'TA4',
      }]);
      const reportIdent = await createReport(newMockReportData);

      const table = await checkRapidReportTable(reportIdent.ident, 'TA4', 'mut');
      expect(table).toBe('therapeuticAssociation');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('IPR-A, disease match, and passed mutation regex check put resistance therapeutic match in table 1 - OK', async () => {
      // create report
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([{
        category: 'therapeutic',
        variantType: 'mut',
        variant: 'TA4',
        iprEvidenceLevel: 'IPR-A',
        kbVariant: 'TA4 specific',
        matchedCancer: true,
        relevance: 'resistance',
        kbVariantId: '#33',
        kbStatementId: '#33',
      }]);
      newMockReportData.genes = newMockReportData.genes.concat([{name: 'TA4gene'}]);
      newMockReportData.smallMutations = newMockReportData.smallMutations.concat([{
        gene: 'TA4gene',
        key: 'TA4',
        displayName: 'TA4',
      }]);
      const reportIdent = await createReport(newMockReportData);

      const table = await checkRapidReportTable(reportIdent.ident, 'TA4', 'mut');
      expect(table).toBe('therapeuticAssociation');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('IPR-B, disease match, and passed mutation regex check put sensitivity therapeutic match in table 1 - OK', async () => {
      // create report
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([{
        category: 'therapeutic',
        variantType: 'mut',
        variant: 'TA4',
        iprEvidenceLevel: 'IPR-B',
        kbVariant: 'TA4 specific',
        matchedCancer: true,
        relevance: 'sensitivity',
        kbVariantId: '#33',
        kbStatementId: '#33',
      }]);
      newMockReportData.genes = newMockReportData.genes.concat([{name: 'TA4gene'}]);
      newMockReportData.smallMutations = newMockReportData.smallMutations.concat([{
        gene: 'TA4gene',
        key: 'TA4',
        displayName: 'TA4',
      }]);
      const reportIdent = await createReport(newMockReportData);

      const table = await checkRapidReportTable(reportIdent.ident, 'TA4', 'mut');
      expect(table).toBe('therapeuticAssociation');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('IPR-B, disease match, and passed mutation regex check put resistance therapeutic match in table 2 - OK', async () => {
      // create report
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([{
        category: 'therapeutic',
        variantType: 'mut',
        variant: 'TA4',
        iprEvidenceLevel: 'IPR-B',
        kbVariant: 'TA4 specific',
        matchedCancer: true,
        relevance: 'resistance',
        kbVariantId: '#33',
        kbStatementId: '#33',
      }]);
      newMockReportData.genes = newMockReportData.genes.concat([{name: 'TA4gene'}]);
      newMockReportData.smallMutations = newMockReportData.smallMutations.concat([{
        gene: 'TA4gene',
        key: 'TA4',
        displayName: 'TA4',
      }]);
      const reportIdent = await createReport(newMockReportData);

      const table = await checkRapidReportTable(reportIdent.ident, 'TA4', 'mut');
      expect(table).toBe('cancerRelevance');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('Low evidence level, disease match, and passed mutation regex check put therapeutic match in table 2 - OK', async () => {
      // create report
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([{
        category: 'therapeutic',
        variantType: 'mut',
        variant: 'TA4',
        iprEvidenceLevel: 'IPR-C',
        kbVariant: 'TA4 specific',
        matchedCancer: true,
        relevance: 'sensitivity',
        kbVariantId: '#33',
        kbStatementId: '#33',
      }]);
      newMockReportData.genes = newMockReportData.genes.concat([{name: 'TA4gene'}]);
      newMockReportData.smallMutations = newMockReportData.smallMutations.concat([{
        gene: 'TA4gene',
        key: 'TA4',
        displayName: 'TA4',
      }]);
      const reportIdent = await createReport(newMockReportData);

      const table = await checkRapidReportTable(reportIdent.ident, 'TA4', 'mut');
      expect(table).toBe('cancerRelevance');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('High evidence, disease mismatch, and passed mutation regex check put therapeutic match in table 2 - OK', async () => {
      // create report
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([{
        category: 'therapeutic',
        variantType: 'mut',
        variant: 'TA4',
        iprEvidenceLevel: 'IPR-B',
        kbVariant: 'TA4 specific',
        matchedCancer: false,
        relevance: 'sensitivity',
        kbVariantId: '#33',
        kbStatementId: '#33',
      }]);
      newMockReportData.genes = newMockReportData.genes.concat([{name: 'TA4gene'}]);
      newMockReportData.smallMutations = newMockReportData.smallMutations.concat([{
        gene: 'TA4gene',
        key: 'TA4',
        displayName: 'TA4',
      }]);
      const reportIdent = await createReport(newMockReportData);

      const table = await checkRapidReportTable(reportIdent.ident, 'TA4', 'mut');
      expect(table).toBe('cancerRelevance');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('High evidence, disease-match, and failed mutation regex check put therapeutic match in table 3 - OK', async () => {
      // create report
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([{
        category: 'therapeutic',
        variantType: 'mut',
        variant: 'TA4',
        iprEvidenceLevel: 'IPR-A',
        kbVariant: 'TA4 mutation',
        matchedCancer: true,
        relevance: 'sensitivity',
        kbVariantId: '#33',
        kbStatementId: '#33',
      }]);
      newMockReportData.genes = newMockReportData.genes.concat([{name: 'TA4gene'}]);
      newMockReportData.smallMutations = newMockReportData.smallMutations.concat([{
        gene: 'TA4gene',
        key: 'TA4',
        displayName: 'TA4',
      }]);
      const reportIdent = await createReport(newMockReportData);

      const table = await checkRapidReportTable(reportIdent.ident, 'TA4', 'mut');
      expect(table).toBe('unknownSignificance');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('MSI matches above cutoff put in table 2 - OK', async () => {
      // create report
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([{
        category: 'therapeutic',
        variantType: 'msi',
        variant: 'TA4',
        iprEvidenceLevel: 'IPR-B',
        kbVariant: 'TA4 specific',
        matchedCancer: true,
        relevance: 'resistance',
        kbVariantId: '#33',
        kbStatementId: '#33',
      }]);
      newMockReportData.genes = newMockReportData.genes.concat([{name: 'TA4gene'}]);
      newMockReportData.msi = newMockReportData.msi.concat([{
        score: 21,
        key: 'TA4',
        displayName: 'TA4',
      }]);
      const reportIdent = await createReport(newMockReportData);

      const table = await checkRapidReportTable(reportIdent.ident, 'TA4', 'msi');
      expect(table).toBe('cancerRelevance');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('MSI matches below cutoff put in no table - OK', async () => {
      // create report
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([{
        category: 'therapeutic',
        variantType: 'msi',
        variant: 'TA4',
        iprEvidenceLevel: 'IPR-A',
        kbVariant: 'TA4 mutation',
        matchedCancer: true,
        relevance: 'resistance',
        kbVariantId: '#33',
        kbStatementId: '#33',
      }]);
      newMockReportData.genes = newMockReportData.genes.concat([{name: 'TA4gene'}]);
      newMockReportData.msi = newMockReportData.msi.concat([{
        score: 19,
        key: 'TA4',
        displayName: 'TA4',
      }]);
      const reportIdent = await createReport(newMockReportData);

      const table = await checkRapidReportTable(reportIdent.ident, 'TA4', 'msi');
      expect(table).toBe('noTable');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('IPR-A, diseased-matched, sensitivity therapeutic mut variants put in table 3 - OK', async () => {
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([{
        category: 'therapeutic',
        variantType: 'mut',
        variant: 'TA4',
        iprEvidenceLevel: 'IPR-A',
        kbVariant: 'TA4 mutation',
        matchedCancer: true,
        relevance: 'sensitivity',
        kbVariantId: '#33',
        kbStatementId: '#33',
      }]);
      newMockReportData.genes = newMockReportData.genes.concat([{name: 'TA4gene'}]);
      newMockReportData.smallMutations = newMockReportData.smallMutations.concat([{
        gene: 'TA4gene',
        key: 'TA4',
        displayName: 'TA4',
      }]);
      const reportIdent = await createReport(newMockReportData);

      const table = await checkRapidReportTable(reportIdent.ident, 'TA4', 'mut');
      expect(table).toBe('unknownSignificance');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('IPR-A, diseased-matched, resistance therapeutic mut variants put in table 3 - OK', async () => {
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([{
        category: 'therapeutic',
        variantType: 'mut',
        variant: 'TA4',
        iprEvidenceLevel: 'IPR-A',
        kbVariant: 'TA4 mutation',
        matchedCancer: true,
        relevance: 'resistance',
        kbVariantId: '#33',
        kbStatementId: '#33',
      }]);
      newMockReportData.genes = newMockReportData.genes.concat([{name: 'TA4gene'}]);
      newMockReportData.smallMutations = newMockReportData.smallMutations.concat([{
        gene: 'TA4gene',
        key: 'TA4',
        displayName: 'TA4',
      }]);
      const reportIdent = await createReport(newMockReportData);

      const table = await checkRapidReportTable(reportIdent.ident, 'TA4', 'mut');
      expect(table).toBe('unknownSignificance');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('IPR-B, diseased-matched, sensitivity therapeutic mut variants put in table 3 - OK', async () => {
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([{
        category: 'therapeutic',
        variantType: 'mut',
        variant: 'TA4',
        iprEvidenceLevel: 'IPR-B',
        kbVariant: 'TA4 mutation',
        matchedCancer: true,
        relevance: 'sensitivity',
        kbVariantId: '#33',
        kbStatementId: '#33',
      }]);
      newMockReportData.genes = newMockReportData.genes.concat([{name: 'TA4gene'}]);
      newMockReportData.smallMutations = newMockReportData.smallMutations.concat([{
        gene: 'TA4gene',
        key: 'TA4',
        displayName: 'TA4',
      }]);
      const reportIdent = await createReport(newMockReportData);

      const table = await checkRapidReportTable(reportIdent.ident, 'TA4', 'mut');
      expect(table).toBe('unknownSignificance');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('IPR-B, diseased-matched, resistance therapeutic variants omitted from table 3 - OK', async () => {
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([{
        category: 'therapeutic',
        variantType: 'mut',
        variant: 'TA4',
        iprEvidenceLevel: 'IPR-B',
        kbVariant: 'TA4 mutation',
        matchedCancer: true,
        relevance: 'resistance',
        kbVariantId: '#33',
        kbStatementId: '#33',
      }]);
      newMockReportData.genes = newMockReportData.genes.concat([{name: 'TA4gene'}]);
      newMockReportData.smallMutations = newMockReportData.smallMutations.concat([{
        gene: 'TA4gene',
        key: 'TA4',
        displayName: 'TA4',
      }]);
      const reportIdent = await createReport(newMockReportData);

      const table = await checkRapidReportTable(reportIdent.ident, 'TA4', 'mut');
      expect(table).toBe('noTable');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('Low evidence, disease-matched, therapeutic variants omitted from table 3 - OK', async () => {
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([{
        category: 'therapeutic',
        variantType: 'mut',
        variant: 'TA4',
        iprEvidenceLevel: 'IPR-C',
        kbVariant: 'TA4 mutation',
        matchedCancer: false,
        relevance: 'sensitivity',
        kbVariantId: '#33',
        kbStatementId: '#33',
      }]);
      newMockReportData.genes = newMockReportData.genes.concat([{name: 'TA4gene'}]);
      newMockReportData.smallMutations = newMockReportData.smallMutations.concat([{
        gene: 'TA4gene',
        key: 'TA4',
        displayName: 'TA4',
      }]);
      const reportIdent = await createReport(newMockReportData);

      const table = await checkRapidReportTable(reportIdent.ident, 'TA4', 'mut');
      expect(table).toBe('noTable');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('High evidence, not disease matched, therapeutic variants omitted from table 3 - OK', async () => {
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([{
        category: 'therapeutic',
        variantType: 'mut',
        variant: 'TA4',
        iprEvidenceLevel: 'IPR-A',
        kbVariant: 'TA4 mutation',
        matchedCancer: false,
        relevance: 'sensitivity',
        kbVariantId: '#33',
        kbStatementId: '#33',
      }]);
      newMockReportData.genes = newMockReportData.genes.concat([{name: 'TA4gene'}]);
      newMockReportData.smallMutations = newMockReportData.smallMutations.concat([{
        gene: 'TA4gene',
        key: 'TA4',
        displayName: 'TA4',
      }]);
      const reportIdent = await createReport(newMockReportData);

      const table = await checkRapidReportTable(reportIdent.ident, 'TA4', 'mut');
      expect(table).toBe('noTable');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('High evidence, disease-matched, non-therapeutic variants omitted from table 3 - OK', async () => {
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([{
        category: 'prognostic',
        variantType: 'mut',
        variant: 'TA4',
        iprEvidenceLevel: 'IPR-A',
        kbVariant: 'TA4 mutation',
        matchedCancer: true,
        relevance: 'sensitivity',
        kbVariantId: '#33',
        kbStatementId: '#33',
      }]);
      newMockReportData.genes = newMockReportData.genes.concat([{name: 'TA4gene'}]);
      newMockReportData.smallMutations = newMockReportData.smallMutations.concat([{
        gene: 'TA4gene',
        key: 'TA4',
        displayName: 'TA4',
      }]);
      const reportIdent = await createReport(newMockReportData);

      const table = await checkRapidReportTable(reportIdent.ident, 'TA4', 'mut');
      expect(table).toBe('noTable');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('Non-qualifying variants put in table 3 if in cancer gene list - OK', async () => {
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([{
        category: 'therapeutic',
        variantType: 'mut',
        variant: 'TA4',
        iprEvidenceLevel: 'IPR-B',
        kbVariant: 'TA4 mutation',
        matchedCancer: true,
        relevance: 'resistance',
        kbVariantId: '#33',
        kbStatementId: '#33',
      }]);
      newMockReportData.genes = newMockReportData.genes.concat([{name: 'TA4gene', cancerGeneListMatch: true}]);
      newMockReportData.smallMutations = newMockReportData.smallMutations.concat([{
        gene: 'TA4gene',
        key: 'TA4',
        displayName: 'TA4',
      }]);
      const reportIdent = await createReport(newMockReportData);

      const table = await checkRapidReportTable(reportIdent.ident, 'TA4', 'mut');
      expect(table).toBe('unknownSignificance');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('Non-qualifying variants put in table 3 if on tumour suppressor gene - OK', async () => {
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([{
        category: 'therapeutic',
        variantType: 'mut',
        variant: 'TA4',
        iprEvidenceLevel: 'IPR-B',
        kbVariant: 'TA4 mutation',
        matchedCancer: true,
        relevance: 'resistance',
        kbVariantId: '#33',
        kbStatementId: '#33',
      }]);
      newMockReportData.genes = newMockReportData.genes.concat([{name: 'TA4gene', tumourSuppressor: true}]);
      newMockReportData.smallMutations = newMockReportData.smallMutations.concat([{
        gene: 'TA4gene',
        key: 'TA4',
        displayName: 'TA4',
      }]);
      const reportIdent = await createReport(newMockReportData);

      const table = await checkRapidReportTable(reportIdent.ident, 'TA4', 'mut');
      expect(table).toBe('unknownSignificance');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('Non-qualifying variants put in table 3 if on oncogene - OK', async () => {
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([{
        category: 'therapeutic',
        variantType: 'mut',
        variant: 'TA4',
        iprEvidenceLevel: 'IPR-B',
        kbVariant: 'TA4 mutation',
        matchedCancer: true,
        relevance: 'resistance',
        kbVariantId: '#33',
        kbStatementId: '#33',
      }]);
      newMockReportData.genes = newMockReportData.genes.concat([{name: 'TA4gene', oncogene: true}]);
      newMockReportData.smallMutations = newMockReportData.smallMutations.concat([{
        gene: 'TA4gene',
        key: 'TA4',
        displayName: 'TA4',
      }]);
      const reportIdent = await createReport(newMockReportData);

      const table = await checkRapidReportTable(reportIdent.ident, 'TA4', 'mut');
      expect(table).toBe('unknownSignificance');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('SVs can be put in table 1 and 2 - OK', async () => {
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([{
        category: 'therapeutic',
        variantType: 'sv',
        variant: 'TA4 sv table 1',
        iprEvidenceLevel: 'IPR-A',
        kbVariant: 'TA4 specific',
        matchedCancer: true,
        relevance: 'sensitivity',
        kbVariantId: '#33',
        kbStatementId: '#33',
      },
      {
        category: 'therapeutic',
        variantType: 'sv',
        variant: 'TA4 sv table 2',
        iprEvidenceLevel: 'IPR-C',
        kbVariant: 'TA4 specific',
        matchedCancer: false,
        relevance: 'sensitivity',
        kbVariantId: '#34',
        kbStatementId: '#34',
      }]);
      newMockReportData.genes = newMockReportData.genes.concat([{name: 'TA4agene', oncogene: true}, {name: 'TA4bgene', oncogene: true}]);
      newMockReportData.structuralVariants = [{
        gene1: 'TA4agene',
        gene2: 'TA4bgene',
        name: 'TA4 sv table 1',
        displayName: 'TA4 sv table 1',
        key: 'TA4 sv table 1',
      },
      {
        gene1: 'TA4agene',
        gene2: 'TA4bgene',
        name: 'TA4 sv table 2',
        displayName: 'TA4 sv table 2',
        key: 'TA4 sv table 2',
      }];
      const reportIdent = await createReport(newMockReportData);

      const var1table = await checkRapidReportTable(reportIdent.ident, 'TA4 sv table 1', 'sv');
      expect(var1table).toBe('therapeuticAssociation');
      const var2table = await checkRapidReportTable(reportIdent.ident, 'TA4 sv table 2', 'sv');
      expect(var2table).toBe('cancerRelevance');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('SVs can not be put in table 3 - OK', async () => {
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([{
        category: 'therapeutic',
        variantType: 'sv',
        variant: 'TA4 sv no table',
        iprEvidenceLevel: 'IPR-B',
        kbVariant: 'TA4 mutation',
        matchedCancer: true,
        relevance: 'resistance',
        kbVariantId: '#33',
        kbStatementId: '#33',
      }]);
      newMockReportData.genes = newMockReportData.genes.concat([{name: 'TA4agene', oncogene: true}, {name: 'TA4bgene', oncogene: true}]);
      newMockReportData.structuralVariants = [{
        key: 'TA4 sv no table',
        gene1: 'TA4agene',
        gene2: 'TA4bgene',
        name: 'TA4 sv no table',
        displayName: 'TA4 sv no table',
      }];
      const reportIdent = await createReport(newMockReportData);

      const table = await checkRapidReportTable(reportIdent.ident, 'TA4 sv no table', 'sv');
      expect(table).toBe('noTable');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('CNVs can be put in table 1 and table 2 - OK', async () => {
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([{
        category: 'therapeutic',
        variantType: 'cnv',
        variant: 'TA4 cnv table 1',
        iprEvidenceLevel: 'IPR-A',
        kbVariant: 'TA4 specific',
        matchedCancer: true,
        relevance: 'sensitivity',
        kbVariantId: '#33',
        kbStatementId: '#33',
      }, {
        category: 'therapeutic',
        variantType: 'cnv',
        variant: 'TA4 cnv table 2',
        iprEvidenceLevel: 'IPR-D',
        kbVariant: 'TA4 specific',
        matchedCancer: false,
        relevance: 'sensitivity',
        kbVariantId: '#34',
        kbStatementId: '#34',
      }]);
      newMockReportData.genes = newMockReportData.genes.concat([{name: 'TA4agene', oncogene: true}, {name: 'TA4bgene'}]);
      newMockReportData.copyVariants = newMockReportData.copyVariants.concat([
        {
          gene: 'TA4agene',
          key: 'TA4 cnv table 1',
          displayName: 'TA4 cnv table 1',
        },
        {
          gene: 'TA4bgene',
          key: 'TA4 cnv table 2',
          displayName: 'TA4 cnv table 2',
        },
      ]);
      const reportIdent = await createReport(newMockReportData);

      const var1table = await checkRapidReportTable(reportIdent.ident, 'TA4 cnv table 1', 'cnv');
      expect(var1table).toBe('therapeuticAssociation');
      const var2table = await checkRapidReportTable(reportIdent.ident, 'TA4 cnv table 2', 'cnv');
      expect(var2table).toBe('cancerRelevance');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('CNVs can be put in table 3 - OK', async () => {
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([{
        category: 'therapeutic',
        variantType: 'cnv',
        variant: 'TA4',
        iprEvidenceLevel: 'IPR-A',
        kbVariant: 'TA4 mutation',
        matchedCancer: true,
        relevance: 'sensitivity',
        kbVariantId: '#33',
        kbStatementId: '#33',
      }]);
      newMockReportData.genes = newMockReportData.genes.concat([{name: 'TA4gene', oncogene: true}]);
      newMockReportData.copyVariants = newMockReportData.copyVariants.concat([
        {
          gene: 'TA4gene',
          key: 'TA4',
          displayName: 'TA4',
        },
      ]);
      const reportIdent = await createReport(newMockReportData);

      const table = await checkRapidReportTable(reportIdent.ident, 'TA4', 'cnv');
      expect(table).toBe('unknownSignificance');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('Variants with no kbmatches can be put in table 3 if gene is tumourSuppressor, cancergenelist or oncogene - OK', async () => {
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.genes = newMockReportData.genes.concat([
        {name: 'TA4agene', oncogene: true},
        {name: 'TA4bgene', cancerGeneListMatch: true},
        {name: 'TA4cgene', tumourSuppressor: true},
        {name: 'TA4dgene'},
      ]);
      newMockReportData.smallMutations = newMockReportData.smallMutations.concat([{
        gene: 'TA4agene',
        key: 'TA4a',
        displayName: 'TA4a',
      },
      {
        gene: 'TA4bgene',
        key: 'TA4b',
        displayName: 'TA4b',
      },
      {
        gene: 'TA4cgene',
        key: 'TA4c',
        displayName: 'TA4c',
      },
      {
        gene: 'TA4dgene',
        key: 'TA4d',
        displayName: 'TA4d',
      }]);
      const reportIdent = await createReport(newMockReportData);

      let table = await checkRapidReportTable(reportIdent.ident, 'TA4a', 'mut');
      expect(table).toBe('unknownSignificance');
      table = await checkRapidReportTable(reportIdent.ident, 'TA4b', 'mut');
      expect(table).toBe('unknownSignificance');
      table = await checkRapidReportTable(reportIdent.ident, 'TA4c', 'mut');
      expect(table).toBe('unknownSignificance');
      table = await checkRapidReportTable(reportIdent.ident, 'TA4d', 'mut');
      expect(table).toBe('noTable');

      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('LOF promotion: Qualifying mutation-type matches promoted if lof variant on tumour suppressor gene found - OK', async () => {
      // TA1 - expect lof promotion to occur - table 1
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.genes = newMockReportData.genes.concat([{
        name: 'TA1gene',
        tumourSuppressor: true,
      }]);
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([{
        category: 'therapeutic',
        variantType: 'mut',
        variant: 'TA1',
        iprEvidenceLevel: 'IPR-A',
        kbVariant: 'TA1 mutation',
        matchedCancer: true,
        relevance: 'sensitivity',
        evidenceLevel: 'table 1',
        kbVariantId: '#26',
        kbStatementId: '#26',
      },
      {
        category: 'biological',
        variantType: 'mut',
        variant: 'TA1',
        iprEvidenceLevel: 'IPR-A',
        kbVariant: 'TA1 frameshift mutation',
        matchedCancer: true,
        relevance: 'likely loss of function',
        evidenceLevel: 'table 2',
        kbVariantId: '#27',
        kbStatementId: '#27',
      }]);
      newMockReportData.smallMutations = newMockReportData.smallMutations.concat([{
        gene: 'TA1gene',
        key: 'TA1',
        displayName: 'TA1',
      }]);

      const reportIdent = await createReport(newMockReportData);

      const table = await checkRapidReportTable(reportIdent.ident, 'TA1', 'mut');
      expect(table).toBe('therapeuticAssociation');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('LOF promotion: Qualifying mutation-type matches not promoted if no-lof variant on tumour suppressor gene found - OK', async () => {
      // TA1 - expect lof promotion to occur - table 1
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.genes = newMockReportData.genes.concat([{
        name: 'TA1gene',
        tumourSuppressor: true,
      }]);
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([{
        category: 'therapeutic',
        variantType: 'mut',
        variant: 'TA1',
        iprEvidenceLevel: 'IPR-A',
        kbVariant: 'TA1 mutation',
        matchedCancer: true,
        relevance: 'sensitivity',
        evidenceLevel: 'table 1',
        kbVariantId: '#26',
        kbStatementId: '#26',
      },
      {
        category: 'biological',
        variantType: 'mut',
        variant: 'TA1',
        iprEvidenceLevel: 'IPR-A',
        kbVariant: 'TA1 frameshift mutation',
        matchedCancer: true,
        relevance: 'no loss of function',
        evidenceLevel: 'table 2',
        kbVariantId: '#27',
        kbStatementId: '#27',
      }]);
      newMockReportData.smallMutations = newMockReportData.smallMutations.concat([{
        gene: 'TA1gene',
        key: 'TA1',
        displayName: 'TA1',
      }]);

      const reportIdent = await createReport(newMockReportData);

      const table = await checkRapidReportTable(reportIdent.ident, 'TA1', 'mut');
      expect(table).toBe('cancerRelevance');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('LOF promotion: Mutation-type matches not promoted if no lof variant - OK', async () => {
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.genes = newMockReportData.genes.concat([{
        name: 'TA1agene',
        tumourSuppressor: true,
      }]);
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([
        {
          category: 'therapeutic',
          variantType: 'mut',
          variant: 'TA1a',
          iprEvidenceLevel: 'IPR-A',
          kbVariant: 'TA1a mutation',
          matchedCancer: true,
          relevance: 'sensitivity',
          evidenceLevel: 'table 2',
          kbVariantId: '#28',
          kbStatementId: '#28',
        },
      ]);
      newMockReportData.smallMutations = newMockReportData.smallMutations.concat([{
        gene: 'TA1agene',
        key: 'TA1a',
        displayName: 'TA1a',
      }]);

      const reportIdent = await createReport(newMockReportData);

      const table = await checkRapidReportTable(reportIdent.ident, 'TA1a', 'mut');
      expect(table).toBe('unknownSignificance');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('LOF promotion: Mutation-type matches not promoted if lof variant not on a tumour suppressor gene - OK', async () => {
      // TA1b - loss of function found but gene is not a tumour suppressor - expect table 2
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.genes = newMockReportData.genes.concat([{
        name: 'TA1bgene',
      }]);
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([
        {
          category: 'therapeutic',
          variantType: 'mut',
          variant: 'TA1b',
          iprEvidenceLevel: 'IPR-A',
          kbVariant: 'TA1b mutation',
          matchedCancer: true,
          relevance: 'sensitivity',
          evidenceLevel: 'table 2',
          kbVariantId: '#29',
          kbStatementId: '#29',
        },
        {
          category: 'biological',
          variantType: 'mut',
          variant: 'TA1b',
          iprEvidenceLevel: 'IPR-A',
          kbVariant: 'TA1b frameshift mutation',
          matchedCancer: true,
          relevance: 'likely loss of function',
          evidenceLevel: 'table 2',
          kbVariantId: '#30',
          kbStatementId: '#30',
        },
      ]);
      newMockReportData.smallMutations = newMockReportData.smallMutations.concat([{
        gene: 'TA1bgene',
        key: 'TA1b',
        displayName: 'TA1b',
      }]);

      const reportIdent = await createReport(newMockReportData);

      const table = await checkRapidReportTable(reportIdent.ident, 'TA1b', 'mut');
      expect(table).toBe('cancerRelevance');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('LOF promotion: Mutation-type matches not promoted if not qualifying due to unmatched disease type - OK', async () => {
      // TA1c - qualifying loss of function found but other kbmatch is not a disease match - expect table 2
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.genes = newMockReportData.genes.concat([{
        name: 'TA1cgene',
        tumourSuppressor: true,
      }]);
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([
        {
          category: 'therapeutic',
          variantType: 'mut',
          variant: 'TA1c',
          iprEvidenceLevel: 'IPR-B',
          kbVariant: 'TA1c mutation',
          matchedCancer: false,
          relevance: 'sensitivity',
          evidenceLevel: 'table 2',
          kbVariantId: '#31',
          disease: 'not a matching disease',
          kbStatementId: '#31',
        },
        {
          category: 'biological',
          variantType: 'mut',
          variant: 'TA1c',
          iprEvidenceLevel: 'IPR-A',
          kbVariant: 'TA1c frameshift mutation',
          matchedCancer: true,
          relevance: 'likely loss of function',
          evidenceLevel: 'table 2',
          kbVariantId: '#32',
          kbStatementId: '#32',
        },
      ]);
      newMockReportData.smallMutations = newMockReportData.smallMutations.concat([{
        gene: 'TA1cgene',
        key: 'TA1c',
        displayName: 'TA1c',
      }]);

      const reportIdent = await createReport(newMockReportData);

      const table = await checkRapidReportTable(reportIdent.ident, 'TA1c', 'mut');
      expect(table).toBe('cancerRelevance');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    test('LOF promotion: Mutation-type matches not promoted if not qualifying due to ipr evidence level - OK', async () => {
      // TA1d - qualifying loss of function found but other kbmatch is not IPR-B or higher - expect table 2
      const newMockReportData = JSON.parse(JSON.stringify(mockReportData));
      newMockReportData.genes = newMockReportData.genes.concat([{
        name: 'TA1dgene',
        tumourSuppressor: true,
      }]);
      newMockReportData.kbMatches = newMockReportData.kbMatches.concat([
        {
          category: 'therapeutic',
          variantType: 'mut',
          variant: 'TA1d',
          iprEvidenceLevel: 'IPR-D',
          kbVariant: 'TA1d mutation',
          matchedCancer: true,
          relevance: 'sensitivity',
          evidenceLevel: 'table 2',
          kbVariantId: '#31',
          kbStatementId: '#31',
        },
        {
          category: 'biological',
          variantType: 'mut',
          variant: 'TA1d',
          iprEvidenceLevel: 'IPR-A',
          kbVariant: 'TA1d frameshift mutation',
          matchedCancer: true,
          relevance: 'likely loss of function',
          evidenceLevel: 'table 2',
          kbVariantId: '#32',
          kbStatementId: '#32',
        },
      ]);
      newMockReportData.smallMutations = newMockReportData.smallMutations.concat([{
        gene: 'TA1dgene',
        key: 'TA1d',
        displayName: 'TA1d',
      }]);

      const reportIdent = await createReport(newMockReportData);

      const table = await checkRapidReportTable(reportIdent.ident, 'TA1d', 'mut');
      expect(table).toBe('cancerRelevance');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    // delete report
    afterAll(async () => {
      await db.models.report.destroy({where: {ident: rapidReportIdent.ident}}, {force: true});
    }, LONGER_TIMEOUT);
  });

  afterAll(async () => {
    await db.models.report.destroy({where: {ident: rapidReportIdent.ident}});
    // , force: true
  }, LONGER_TIMEOUT);
});

/**
 * Fetches variants from a report filtered by gene name and variant type
 *
 * @param {Object} params - The parameters for fetching variants
 * @param {string} params.reportId - The ID of the report to fetch variants from
 * @param {string} params.geneName - The name of the gene to filter by
 * @param {string} [params.table='cancerRelevance'] - The table to fetch variants from
 * @param {string} [params.variantType='cnv'] - The type of variant to filter by
 * @returns {Promise<Array>} The filtered variants
 */
async function fetchVariants({reportId, geneName, table = 'cancerRelevance', variantType = 'cnv'}) {
  const res = await request
    .get(`/api/reports/${reportId}/variants`)
    .query({rapidTable: table})
    .auth(username, password)
    .type('json');

  return res.body.filter((v) => {
    return v.variantType === variantType && v.gene.name === geneName;
  });
}

/**
 * Updates the variant tags for a report
 *
 * @param {string} reportId - The ID of the report to update
 * @param {Object} testVariant - The variant object to update
 * @param {Array<string>} stmtIds - Array of statement IDs to update
 * @param {string} tableTag - The table tag value to set
 * @returns {Promise<void>} Resolves when the update is complete.
 */
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

/**
 * Updates the summary table tags for specific statements of a variant in a report.
 *
 * @param {string} reportId - The ID of the report to update.
 * @param {Object} testVariant - The variant object containing the statements.
 * @param {Array<string>} stmtIds - Array of statement IDs to update.
 * @param {string} tableTag - The table tag value to set.
 * @returns {Promise<void>} Resolves when the update is complete.
 */
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

/**
 * Fetches KB matched statements for a given report.
 *
 * @param {string} reportId - The ID of the report to fetch statements from.
 * @returns {Promise<Array>} - The array of KB matched statements.
 */
async function fetchStatements(reportId) {
  const res = await request
    .get(`/api/reports/${reportId}/kb-matches/kb-matched-statements`)
    .auth(username, password)
    .type('json')
    .expect(HTTP_STATUS.OK);

  return res.body;
}

/**
 * Asserts the presence or absence of a tag for a variant in the given statements.
 *
 * @param {Array} statements - Array of statement objects to check.
 * @param {string} tag - The rapid report table tag to check.
 * @param {string} variantType - The type of variant to check.
 * @param {string} variantIdent - The identifier of the variant.
 * @param {boolean} [shouldContain=true] - Whether the variant should be present in the tag list.
 * @returns {void} This function does not return a value.
 */
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

describe('checkKbDataSummaryTableTag and updateKbDataSummaryTableTag utils', () => {
  test('checkKbDataSummaryTableTag identifies presence/absence of tag correctly', () => {
    const kbData = {
      rapidReportTableTag: {
        therapeuticAssociation: {
          cnv: ['var1', 'var2'],
          mut: ['var3'],
        },
        cancerRelevance: {
          cnv: ['var4'],
        },
      },
    };
    expect(checkKbDataSummaryTableTag(kbData, 'cnv', 'var2')).toBe('therapeuticAssociation');
    expect(checkKbDataSummaryTableTag(kbData, 'mut', 'var3')).toBe('therapeuticAssociation');
    expect(checkKbDataSummaryTableTag(kbData, 'cnv', 'var4')).toBe('cancerRelevance');
  });

  test('checkKbDataSummaryTableTag returns undefined when kbData empty', () => {
    const kbData = {};
    expect(checkKbDataSummaryTableTag(kbData, 'cnv', 'var1')).toBe(undefined);
  });

  test('checkKbDataSummaryTableTag returns undefined when kbData.rapidReportTabletag dict empty', () => {
    const kbData = {rapidReportTableTag: {}};
    expect(checkKbDataSummaryTableTag(kbData, 'cnv', 'var1')).toBe(undefined);
  });

  test('checkKbDataSummaryTableTag returns undefined when variantType entry not found', () => {
    const kbData = {
      rapidReportTableTag: {
        cancerRelevance: {
          cnv: ['var4'],
        },
      },
    };
    expect(checkKbDataSummaryTableTag(kbData, 'variantTypeNotFound', 'var4')).toBe(undefined);
  });

  test('checkKbDataSummaryTableTag returns undefined when variantIdent list null or empty', () => {
    let kbData = {
      rapidReportTableTag: {
        cancerRelevance: {
          cnv: null,
        },
      },
    };
    expect(checkKbDataSummaryTableTag(kbData, 'cnv', 'var1')).toBe(undefined);
    kbData = {
      rapidReportTableTag: {
        cancerRelevance: {
          cnv: [],
        },
      },
    };
    expect(checkKbDataSummaryTableTag(kbData, 'cnv', 'var1')).toBe(undefined);
  });

  test('checkKbDataSummaryTableTag returns undefined when variantIdent not in list', () => {
    const kbData = {
      rapidReportTableTag: {
        cancerRelevance: {
          cnv: ['var1'],
        },
      },
    };
    expect(checkKbDataSummaryTableTag(kbData, 'cnv', 'variantIdentNotFound')).toBe(undefined);
  });

  test('updateKbDataSummaryTableTag adds/removes tags correctly', () => {
    let kbData = {};
    const ta = 'therapeuticAssociation';
    const cr = 'cancerRelevance';
    // add first tag
    kbData = updateKbDataSummaryTableTag(kbData, ta, 'cnv', 'var1');
    expect(checkKbDataSummaryTableTag(kbData, 'cnv', 'var1')).toBe(ta);

    // add second tag, different var
    kbData = updateKbDataSummaryTableTag(kbData, ta, 'cnv', 'var2');
    expect(checkKbDataSummaryTableTag(kbData, 'cnv', 'var1')).toBe(ta);
    expect(checkKbDataSummaryTableTag(kbData, 'cnv', 'var2')).toBe(ta);

    // add third tag, different varType
    kbData = updateKbDataSummaryTableTag(kbData, ta, 'mut', 'var3');
    expect(checkKbDataSummaryTableTag(kbData, 'cnv', 'var1')).toBe(ta);
    expect(checkKbDataSummaryTableTag(kbData, 'cnv', 'var2')).toBe(ta);
    expect(checkKbDataSummaryTableTag(kbData, 'mut', 'var3')).toBe(ta);

    // add fourth tag, different table
    kbData = updateKbDataSummaryTableTag(kbData, cr, 'cnv', 'var4');
    expect(checkKbDataSummaryTableTag(kbData, 'cnv', 'var1')).toBe(ta);
    expect(checkKbDataSummaryTableTag(kbData, 'cnv', 'var2')).toBe(ta);
    expect(checkKbDataSummaryTableTag(kbData, 'mut', 'var3')).toBe(ta);
    expect(checkKbDataSummaryTableTag(kbData, 'cnv', 'var4')).toBe(cr);

    // update tag to existing different tag
    kbData = updateKbDataSummaryTableTag(kbData, cr, 'cnv', 'var2');
    expect(checkKbDataSummaryTableTag(kbData, 'cnv', 'var1')).toBe(ta);
    expect(checkKbDataSummaryTableTag(kbData, 'cnv', 'var2')).toBe(cr);
    expect(checkKbDataSummaryTableTag(kbData, 'mut', 'var3')).toBe(ta);
    expect(checkKbDataSummaryTableTag(kbData, 'cnv', 'var4')).toBe(cr);

    // update tag to new tag
    kbData = updateKbDataSummaryTableTag(kbData, 'newTag', 'cnv', 'var1');
    expect(checkKbDataSummaryTableTag(kbData, 'cnv', 'var1')).toBe('newTag');
    expect(checkKbDataSummaryTableTag(kbData, 'cnv', 'var2')).toBe(cr);
    expect(checkKbDataSummaryTableTag(kbData, 'mut', 'var3')).toBe(ta);
  });

  test('updateKbDataSummaryTableTag handles null kbData', () => {
    let kbData = null;
    const ta = 'therapeuticAssociation';

    // update tag to existing different tag
    kbData = updateKbDataSummaryTableTag(kbData, ta, 'cnv', 'var1');
    expect(checkKbDataSummaryTableTag(kbData, 'cnv', 'var1')).toBe(ta);
  });
});

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
