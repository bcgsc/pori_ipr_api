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
        kbVariant: 'TA4 mutation',
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

    test('CNVs can not be put in table 3 - OK', async () => {
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
      expect(table).toBe('noTable');
      await db.models.report.destroy({where: {ident: reportIdent.ident}});
    });

    // add sv tests for alternate gene join
    // https://ipr.bcgsc.ca/report/c0b1597f-b89c-442d-aab4-ba1b6eff3f4b/summary
    // https://ipr.bcgsc.ca/report/f7345344-446e-4b40-b0c7-5cd6b68c8227/summary

    // delete report
    afterAll(async () => {
      await db.models.report.destroy({where: {ident: rapidReportIdent.ident}}, {force: true});
    }, LONGER_TIMEOUT);
  });

  afterAll(async () => {
    global.gc && global.gc();
    await server.close();
  });
});
