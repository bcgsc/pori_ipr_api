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

const checkRapidReportMatches = (kbMatches, expectedMatches, unexpectedMatches) => {
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
  let rapidGene;
  let rapidVariant;
  let rapidDataIprA;
  let rapidDataIprB;
  let rapidDataIprANotTherapeutic;
  let rapidDataIprC;
  let rapidDataIprNull;

  let kbMatchRapidDataIprA;
  let kbMatchRapidDataIprB;
  let kbMatchRapidDataIprANotTherapeutic;
  let kbMatchRapidDataIprC;
  let kbMatchRapidDataIprNull;

  let therapeuticAssociationMatches;
  let cancerRelevanceMatches;

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
    variant = await db.models.copyVariants.create({
      reportId: report.id,
      geneId: gene.id,
    });

    createData = {
      reportId: report.id,
      variantId: variant.id,
      category: 'unknown',
      variantType: 'cnv',
    };

    const rapidTemplate = await db.models.template.findOne({where: {name: 'rapid'}});

    rapidReport = await db.models.report.create({
      templateId: rapidTemplate.id,
      patientId: mockReportData.patientId,
    });
    rapidGene = await db.models.genes.create({
      reportId: rapidReport.id,
      name: mockReportData.genes[0].name,
    });
    rapidVariant = await db.models.copyVariants.create({
      reportId: rapidReport.id,
      geneId: rapidGene.id,
    });

    rapidDataIprA = {
      reportId: rapidReport.id,
      variantId: rapidVariant.id,
      category: 'therapeutic',
      variantType: 'cnv',
      iprEvidenceLevel: 'IPR-A',
    };

    rapidDataIprB = {
      reportId: rapidReport.id,
      variantId: rapidVariant.id,
      category: 'therapeutic',
      variantType: 'cnv',
      iprEvidenceLevel: 'IPR-B',
    };

    rapidDataIprANotTherapeutic = {
      reportId: rapidReport.id,
      variantId: rapidVariant.id,
      category: 'unknown',
      variantType: 'cnv',
      iprEvidenceLevel: 'IPR-A',
    };

    rapidDataTherapeuticIprC = {
      reportId: rapidReport.id,
      variantId: rapidVariant.id,
      category: 'therapeutic',
      variantType: 'cnv',
      iprEvidenceLevel: 'IPR-C',
    };

    rapidDataUnknownIprC = {
      reportId: rapidReport.id,
      variantId: rapidVariant.id,
      category: 'unknown',
      variantType: 'cnv',
      iprEvidenceLevel: 'IPR-C',
    };

    rapidDataUnknownNull = {
      reportId: rapidReport.id,
      variantId: rapidVariant.id,
      category: 'unknown',
      variantType: 'cnv',
      iprEvidenceLevel: null,
    };

    rapidDataTherapeuticNull = {
      reportId: rapidReport.id,
      variantId: rapidVariant.id,
      category: 'therapeutic',
      variantType: 'cnv',
      iprEvidenceLevel: null,
    };


    kbMatch = await db.models.kbMatches.create(createData);
    kbMatchRapidDataIprA = await db.models.kbMatches.create(rapidDataIprA);
    kbMatchRapidDataIprB = await db.models.kbMatches.create(rapidDataIprB);
    kbMatchRapidDataIprANotTherapeutic = await db.models.kbMatches.create(
      rapidDataIprANotTherapeutic,
    );
    kbMatchRapidDataTherapeuticIprC = await db.models.kbMatches.create(rapidDataTherapeuticIprC);
    kbMatchRapidDataUnknownIprC = await db.models.kbMatches.create(rapidDataUnknownIprC);

    kbMatchRapidDataIprTherapeuticNull = await db.models.kbMatches.create(rapidDataTherapeuticNull);
    kbMatchRapidDataIprUnknownNull = await db.models.kbMatches.create(rapidDataUnknownNull);

    therapeuticAssociationMatches = [kbMatchRapidDataIprA, kbMatchRapidDataIprB];
    cancerRelevanceMatches = [
      kbMatchRapidDataIprANotTherapeutic,
      kbMatchRapidDataTherapeuticIprC,
      kbMatchRapidDataUnknownIprC,
      kbMatchRapidDataIprTherapeuticNull,
      kbMatchRapidDataIprUnknownNull,
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

      checkRapidReportMatches(res.body, therapeuticAssociationMatches, cancerRelevanceMatches);
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

      checkRapidReportMatches(res.body, cancerRelevanceMatches, therapeuticAssociationMatches);
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
