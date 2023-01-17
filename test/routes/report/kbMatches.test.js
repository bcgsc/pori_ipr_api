const HTTP_STATUS = require('http-status-codes');

const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../../../app/models');

const mockReportData = require('../../testData/mockReportData.json');

const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

const LONGER_TIMEOUT = 50000;

let server;
let request;

const kbMatchProperties = [
  'ident', 'createdAt', 'updatedAt', 'category', 'approvedTherapy', 'kbVariant', 'disease',
  'relevance', 'context', 'status', 'reference', 'sample', 'evidenceLevel', 'matchedCancer',
  'pmidRef', 'variantType', 'kbVariantId', 'kbStatementId', 'kbData', 'variant', 'inferred',
  'reviewStatus', 'externalSource', 'externalStatementId', 'reviewStatus', 'iprEvidenceLevel',
];

const checkKbMatch = (kbMatchObject) => {
  kbMatchProperties.forEach((element) => {
    expect(kbMatchObject).toHaveProperty(element);
  });
  expect(kbMatchObject.variant).toHaveProperty('ident');
};

const checkRapidReportMatches = (
  kbMatches,
  expectedMatches,
  unexpectedMatches,
) => {
  let found = true;

  expectedMatches.forEach((expectedMatch) => {
    if (!(kbMatches.find((kbMatch) => {return kbMatch.ident === expectedMatch.ident;}))) {
      found = false;
    }
  });

  unexpectedMatches.forEach((unexpectedMatch) => {
    if (kbMatches.find((kbMatch) => {return kbMatch.ident === unexpectedMatch.ident;})) {
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

// Tests for /kb-matches endpoint
describe('/reports/{REPORTID}/kb-matches', () => {
  let report;
  let gene;
  let variant;
  let kbMatch;
  let createData;

  let rapidReport;
  let rapidGeneTA;
  let rapidGeneCR;

  let rapidVariantTA;
  let rapidVariantCR;

  let rapidDataIprA;
  let rapidDataIprB;
  let rapidDataAlreadyReported;
  let rapidDataIprANotTherapeutic;
  let rapidDataTherapeuticIprC;
  let rapidDataUnknownIprC;
  let rapidDataUnknownNull;
  let rapidDataTherapeuticNull;
  let rapidDataIprAMatchedCancerFalse;
  let rapidDataExp;

  let kbMatchRapidDataIprA;
  let kbMatchRapidDataIprB;
  let kbMatchRapidDataIprANotTherapeutic;
  let kbMatchRapidDataAlreadyReported;
  let kbMatchRapidDataTherapeuticIprC;
  let kbMatchRapidDataUnknownIprC;
  let kbMatchRapidDataIprTherapeuticNull;
  let kbMatchRapidDataIprUnknownNull;
  let kbMatchRapidDataIprAMatchedCancerFalse;
  let kbMatchRapidDataExp;

  let therapeuticAssociationMatches;
  let cancerRelevanceMatches;
  let unknownSignificanceMatches;
  let excludedMatches;

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // Create Report and kbMatch
    report = await db.models.report.create({
      templateId: template.id,
      patientId: mockReportData.patientId,
    });
    gene = await db.models.genes.create({
      reportId: report.id,
      name: mockReportData.genes[0].name,
    });
    variant = await db.models.smallMutations.create({
      reportId: report.id,
      geneId: gene.id,
    });

    createData = {
      reportId: report.id,
      variantId: variant.id,
      category: 'unknown',
      variantType: 'cnv',
    };

    let rapidTemplate = await db.models.template.findOne({where: {name: 'rapid'}});

    if (!rapidTemplate) {
      rapidTemplate = await db.models.template.create({
        name: 'rapid',
        sections: [],
      });
    }

    rapidReport = await db.models.report.create({
      templateId: rapidTemplate.id,
      patientId: mockReportData.patientId,
    });
    rapidGeneTA = await db.models.genes.create({
      reportId: rapidReport.id,
      name: 'TA',
    });
    rapidGeneCR = await db.models.genes.create({
      reportId: rapidReport.id,
      name: 'CR',
    });

    rapidVariantTA = await db.models.copyVariants.create({
      reportId: rapidReport.id,
      geneId: rapidGeneTA.id,
      hgvsProtein: 'TA',
    });
    rapidVariantCR = await db.models.copyVariants.create({
      reportId: rapidReport.id,
      geneId: rapidGeneCR.id,
      hgvsProtein: 'CR',
    });

    rapidDataIprA = {
      reportId: rapidReport.id,
      variantId: rapidVariantTA.id,
      category: 'therapeutic',
      variantType: 'cnv',
      iprEvidenceLevel: 'IPR-A',
      matchedCancer: true,
    };

    rapidDataIprB = {
      reportId: rapidReport.id,
      variantId: rapidVariantTA.id,
      category: 'therapeutic',
      variantType: 'cnv',
      iprEvidenceLevel: 'IPR-B',
      matchedCancer: true,
    };

    rapidDataAlreadyReported = {
      reportId: rapidReport.id,
      variantId: rapidVariantTA.id,
      category: 'unknown',
      variantType: 'cnv',
      iprEvidenceLevel: 'IPR-A',
    };

    rapidDataIprANotTherapeutic = {
      reportId: rapidReport.id,
      variantId: rapidVariantCR.id,
      category: 'unknown',
      variantType: 'cnv',
      iprEvidenceLevel: 'IPR-A',
    };

    rapidDataTherapeuticIprC = {
      reportId: rapidReport.id,
      variantId: rapidVariantCR.id,
      category: 'therapeutic',
      variantType: 'cnv',
      iprEvidenceLevel: 'IPR-C',
    };

    rapidDataUnknownIprC = {
      reportId: rapidReport.id,
      variantId: rapidVariantCR.id,
      category: 'unknown',
      variantType: 'cnv',
      iprEvidenceLevel: 'IPR-C',
    };

    rapidDataUnknownNull = {
      reportId: rapidReport.id,
      variantId: rapidVariantCR.id,
      category: 'unknown',
      variantType: 'cnv',
      iprEvidenceLevel: null,
    };

    rapidDataTherapeuticNull = {
      reportId: rapidReport.id,
      variantId: rapidVariantCR.id,
      category: 'therapeutic',
      variantType: 'cnv',
      iprEvidenceLevel: null,
    };

    rapidDataIprAMatchedCancerFalse = {
      reportId: rapidReport.id,
      variantId: rapidVariantCR.id,
      category: 'therapeutic',
      variantType: 'cnv',
      iprEvidenceLevel: 'IPR-A',
      matchedCancer: false,
    };

    rapidDataExp = {
      reportId: rapidReport.id,
      variantId: rapidVariantCR.id,
      category: 'therapeutic',
      variantType: 'exp',
      iprEvidenceLevel: 'IPR-A',
      matchedCancer: true,
    };

    kbMatch = await db.models.kbMatches.create(createData);
    kbMatchRapidDataIprA = await db.models.kbMatches.create(rapidDataIprA);
    kbMatchRapidDataIprB = await db.models.kbMatches.create(rapidDataIprB);
    kbMatchRapidDataIprANotTherapeutic = await db.models.kbMatches.create(
      rapidDataIprANotTherapeutic,
    );
    kbMatchRapidDataAlreadyReported = await db.models.kbMatches.create(
      rapidDataAlreadyReported,
    );
    kbMatchRapidDataTherapeuticIprC = await db.models.kbMatches.create(rapidDataTherapeuticIprC);
    kbMatchRapidDataUnknownIprC = await db.models.kbMatches.create(rapidDataUnknownIprC);

    kbMatchRapidDataIprTherapeuticNull = await db.models.kbMatches.create(rapidDataTherapeuticNull);
    kbMatchRapidDataIprUnknownNull = await db.models.kbMatches.create(rapidDataUnknownNull);

    kbMatchRapidDataIprAMatchedCancerFalse = await
    db.models.kbMatches.create(rapidDataIprAMatchedCancerFalse);

    kbMatchRapidDataExp = await
    db.models.kbMatches.create(rapidDataExp);

    therapeuticAssociationMatches = [
      kbMatchRapidDataIprA,
      kbMatchRapidDataIprB,
    ];
    cancerRelevanceMatches = [
      kbMatchRapidDataIprANotTherapeutic,
      kbMatchRapidDataTherapeuticIprC,
      kbMatchRapidDataUnknownIprC,
      kbMatchRapidDataIprTherapeuticNull,
      kbMatchRapidDataIprUnknownNull,
      kbMatchRapidDataIprAMatchedCancerFalse,
    ];
    unknownSignificanceMatches = [];
    excludedMatches = [
      kbMatchRapidDataExp,
      kbMatchRapidDataAlreadyReported,
    ];
  }, LONGER_TIMEOUT);

  describe('GET', () => {
    test('Getting all kb-matches is ok', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/kb-matches`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      checkKbMatch(res.body[0]);
    });

    test('Getting a specific kb-match is ok', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/kb-matches/${kbMatch.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkKbMatch(res.body);
    });
  });

  describe('GET - Rapid report', () => {
    test('Getting Therapeutic Association - OK', async () => {
      const res = await request
        .get(`/api/reports/${rapidReport.ident}/kb-matches`)
        .query({rapidTable: 'therapeuticAssociation'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      checkKbMatch(res.body[0]);

      checkRapidReportMatches(
        res.body,
        therapeuticAssociationMatches,
        [...cancerRelevanceMatches, ...excludedMatches, ...unknownSignificanceMatches],
      );
    });

    test('Getting Cancer Relevance - OK', async () => {
      const res = await request
        .get(`/api/reports/${rapidReport.ident}/kb-matches`)
        .query({rapidTable: 'cancerRelevance'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      checkKbMatch(res.body[0]);

      checkRapidReportMatches(
        res.body,
        cancerRelevanceMatches,
        [...therapeuticAssociationMatches, ...excludedMatches, ...unknownSignificanceMatches],
      );
    });

    test('Getting Unknown Significance - OK', async () => {
      const res = await request
        .get(`/api/reports/${rapidReport.ident}/kb-matches`)
        .query({rapidTable: 'unknownSignificance'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      // TODO: Checks won't work due to missing test data, re-enable once we have data
      // expect(Array.isArray(res.body)).toBe(true);
      // checkKbMatch(res.body[0]);

      checkRapidReportMatches(
        res.body,
        unknownSignificanceMatches,
        [...cancerRelevanceMatches, ...therapeuticAssociationMatches, ...excludedMatches],
      );
    });
  });

  describe('DELETE', () => {
    let kbMatchDelete;

    beforeEach(async () => {
      kbMatchDelete = await db.models.kbMatches.create(createData);
    });

    afterEach(async () => {
      if (kbMatchDelete) {
        await db.models.kbMatches.destroy({where: {ident: kbMatchDelete.ident}, force: true});
      }
    });

    test('/{kbMatch} - 204 Successful kbMatch delete', async () => {
      await request
        .delete(`/api/reports/${report.ident}/kb-matches/${kbMatchDelete.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify it was deleted from db
      const results = await db.models.kbMatches.findAll({where: {ident: kbMatchDelete.ident}});
      expect(results.length).toBe(0);
    });
  });

  // delete report
  afterAll(async () => {
    await db.models.report.destroy({where: {id: report.id}, force: true});
  }, LONGER_TIMEOUT);
});

afterAll(async () => {
  await server.close();
});
