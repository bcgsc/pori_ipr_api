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
  expectedMatches,
  unexpectedMatches,
) => {
  let found = true;

  let kbMatches = [];

  for (const variant of variants) {
    kbMatches = kbMatches.concat(variant.kbMatches);
  }

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

const checkVariantsFilter = (
  variants,
  expectedVariants,
  unexpectedVariants,
) => {
  let found = true;

  expectedVariants.forEach((expectedVariant) => {
    if (!(variants.find((variant) => {return variant.ident === expectedVariant.ident;}))) {
      found = false;
    }
  });

  unexpectedVariants.forEach((unexpectedVariant) => {
    if ((variants.find((variant) => {return variant.ident === unexpectedVariant.ident;}))) {
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
  let rapidReport;

  let rapidGeneTA;
  let rapidGeneCR;
  let rapidGeneGeneric;
  let rapidGeneUSOncogene;
  let rapidGeneUStumourSuppressor;
  let rapidGeneUSAllTrue;
  let rapidGeneUSAllFalse;

  let rapidVariantTA;
  let rapidVariantCR;
  let rapidVariantTAGeneric;
  let rapidVariantCRGeneric;
  let rapidVariantUSOncogene;
  let rapidVariantUStumourSuppressor;
  let rapidVariantUSAllTrue;
  let rapidVariantUSAllFalse;
  let rapidVariantMsi;
  let rapidVariantMss;
  let rapidVariantTmb;

  let rapidDataIprA;
  let rapidDataIprAGeneric;
  let rapidDataIprB;
  let rapidDataAlreadyReported;
  let rapidDataIprANotTherapeuticMsi;
  let rapidDataIprANotTherapeuticTmb;
  let rapidDataIprANotTherapeutic;
  let rapidDataTherapeuticIprC;
  let rapidDataTherapeuticIprCGeneric;
  let rapidDataUnknownIprC;
  let rapidDataUnknownNull;
  let rapidDataTherapeuticNull;
  let rapidDataIprAMatchedCancerFalse;
  let rapidDataExp;

  let kbMatchRapidDataIprA;
  let kbMatchRapidDataIprAGeneric;
  let kbMatchRapidDataIprB;
  let kbMatchRapidDataIprANotTherapeutic;
  let kbMatchRapidDataIprANotTherapeuticMsi;
  let kbMatchRapidDataIprANotTherapeuticTmb;
  let kbMatchRapidDataAlreadyReported;
  let kbMatchRapidDataTherapeuticIprC;
  let kbMatchRapidDataTherapeuticIprCGeneric;
  let kbMatchRapidDataUnknownIprC;
  let kbMatchRapidDataIprTherapeuticNull;
  let kbMatchRapidDataIprUnknownNull;
  let kbMatchRapidDataIprAMatchedCancerFalse;
  let kbMatchRapidDataExp;

  let therapeuticAssociationMatches;
  let cancerRelevanceMatches;
  let unknownSignificanceMatches;
  let excludedMatches;

  let therapeuticAssociationVariants;
  let cancerRelevanceVariants;
  let unknownSignificanceVariants;
  let excludedVariants;

  beforeAll(async () => {
    // Get genomic template
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
    rapidGeneGeneric = await db.models.genes.create({
      reportId: rapidReport.id,
      name: 'Generic',
      oncogene: true,
      tumourSuppressor: true,
    });

    rapidGeneUSOncogene = await db.models.genes.create({
      reportId: rapidReport.id,
      name: 'US1',
      oncogene: true,
      tumourSuppressor: false,
    });
    rapidGeneUStumourSuppressor = await db.models.genes.create({
      reportId: rapidReport.id,
      name: 'US2',
      oncogene: false,
      tumourSuppressor: true,
    });
    rapidGeneUSAllTrue = await db.models.genes.create({
      reportId: rapidReport.id,
      name: 'US3',
      oncogene: true,
      tumourSuppressor: true,
    });
    rapidGeneUSAllFalse = await db.models.genes.create({
      reportId: rapidReport.id,
      name: 'US4',
      oncogene: false,
      tumourSuppressor: false,
    });

    rapidVariantTA = await db.models.copyVariants.create({
      reportId: rapidReport.id,
      geneId: rapidGeneTA.id,
    });
    rapidVariantCR = await db.models.copyVariants.create({
      reportId: rapidReport.id,
      geneId: rapidGeneCR.id,
    });

    rapidVariantTAGeneric = await db.models.smallMutations.create({
      reportId: rapidReport.id,
      geneId: rapidGeneGeneric.id,
    });
    rapidVariantCRGeneric = await db.models.smallMutations.create({
      reportId: rapidReport.id,
      geneId: rapidGeneGeneric.id,
    });

    rapidVariantUSOncogene = await db.models.smallMutations.create({
      reportId: rapidReport.id,
      geneId: rapidGeneUSOncogene.id,
    });
    rapidVariantUStumourSuppressor = await db.models.smallMutations.create({
      reportId: rapidReport.id,
      geneId: rapidGeneUStumourSuppressor.id,
    });
    rapidVariantUSAllTrue = await db.models.smallMutations.create({
      reportId: rapidReport.id,
      geneId: rapidGeneUSAllTrue.id,
    });
    rapidVariantUSAllFalse = await db.models.smallMutations.create({
      reportId: rapidReport.id,
      geneId: rapidGeneUSAllFalse.id,
    });

    rapidVariantMsi = await db.models.msi.create({
      reportId: rapidReport.id,
      score: 100.00,
    });
    rapidVariantMss = await db.models.msi.create({
      reportId: rapidReport.id,
      score: 15.00,
    });
    rapidVariantTmb = await db.models.tmburMutationBurden.create({
      reportId: rapidReport.id,
    });

    rapidDataIprA = {
      reportId: rapidReport.id,
      variantId: rapidVariantTA.id,
      category: 'therapeutic',
      variantType: 'cnv',
      iprEvidenceLevel: 'IPR-A',
      kbVariant: 'this should be in table 1',
      matchedCancer: true,
    };

    rapidDataIprB = {
      reportId: rapidReport.id,
      variantId: rapidVariantTA.id,
      category: 'therapeutic',
      variantType: 'cnv',
      iprEvidenceLevel: 'IPR-B',
      matchedCancer: true,
      kbVariant: 'thisshouldbeintable1',
    };

    rapidDataAlreadyReported = {
      reportId: rapidReport.id,
      variantId: rapidVariantTA.id,
      category: 'unknown',
      variantType: 'cnv',
      iprEvidenceLevel: 'IPR-A',
      kbVariant: 'geneX specific mutation',
    };

    rapidDataIprANotTherapeutic = {
      reportId: rapidReport.id,
      variantId: rapidVariantCR.id,
      category: 'unknown',
      variantType: 'cnv',
      iprEvidenceLevel: 'IPR-A',
      kbVariant: 'this.should.be:table2',
    };

    rapidDataIprANotTherapeuticMsi = {
      reportId: rapidReport.id,
      variantId: rapidVariantMsi.id,
      category: 'unknown',
      variantType: 'msi',
      iprEvidenceLevel: 'IPR-A',
      kbVariant: 'also should be table 2',
    };

    rapidDataIprANotTherapeuticTmb = {
      reportId: rapidReport.id,
      variantId: rapidVariantTmb.id,
      category: 'unknown',
      variantType: 'tmb',
      iprEvidenceLevel: 'IPR-A',
      kbVariant: 'geneX specific mutation',
    };

    rapidDataTherapeuticIprC = {
      reportId: rapidReport.id,
      variantId: rapidVariantCR.id,
      category: 'therapeutic',
      variantType: 'cnv',
      iprEvidenceLevel: 'IPR-C',
      kbVariant: 'table2 specific mutation',
    };

    rapidDataUnknownIprC = {
      reportId: rapidReport.id,
      variantId: rapidVariantCR.id,
      category: 'unknown',
      variantType: 'cnv',
      iprEvidenceLevel: 'IPR-C',
      kbVariant: 'geneX specific mutation',
    };

    rapidDataUnknownNull = {
      reportId: rapidReport.id,
      variantId: rapidVariantCR.id,
      category: 'unknown',
      variantType: 'cnv',
      iprEvidenceLevel: null,
      kbVariant: 'geneX specific mutation',
    };

    rapidDataTherapeuticNull = {
      reportId: rapidReport.id,
      variantId: rapidVariantCR.id,
      category: 'therapeutic',
      variantType: 'cnv',
      iprEvidenceLevel: null,
      kbVariant: 'geneX specific mutation',
    };

    rapidDataIprAMatchedCancerFalse = {
      reportId: rapidReport.id,
      variantId: rapidVariantCR.id,
      category: 'therapeutic',
      variantType: 'cnv',
      iprEvidenceLevel: 'IPR-A',
      matchedCancer: false,
      kbVariant: 'geneX specific mutation',
    };

    rapidDataExp = {
      reportId: rapidReport.id,
      variantId: rapidVariantCR.id,
      category: 'therapeutic',
      variantType: 'exp',
      iprEvidenceLevel: 'IPR-A',
      matchedCancer: true,
      kbVariant: 'geneX specific mutation',
    };

    rapidDataIprAGeneric = {
      reportId: rapidReport.id,
      variantId: rapidVariantTAGeneric.id,
      category: 'therapeutic',
      variantType: 'mut',
      iprEvidenceLevel: 'IPR-A',
      kbVariant: 'geneX missense',
      matchedCancer: true,
    };

    rapidDataTherapeuticIprCGeneric = {
      reportId: rapidReport.id,
      variantId: rapidVariantCRGeneric.id,
      category: 'therapeutic',
      variantType: 'mut',
      iprEvidenceLevel: 'IPR-C',
      kbVariant: 'geneX mutation',
    };

    kbMatchRapidDataIprA = await db.models.kbMatches.create(rapidDataIprA);
    kbMatchRapidDataIprB = await db.models.kbMatches.create(rapidDataIprB);
    kbMatchRapidDataIprANotTherapeutic = await db.models.kbMatches.create(
      rapidDataIprANotTherapeutic,
    );
    kbMatchRapidDataIprANotTherapeuticMsi = await db.models.kbMatches.create(
      rapidDataIprANotTherapeuticMsi,
    );
    kbMatchRapidDataIprANotTherapeuticTmb = await db.models.kbMatches.create(
      rapidDataIprANotTherapeuticTmb,
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

    kbMatchRapidDataIprAGeneric = await db.models.kbMatches.create(rapidDataIprAGeneric);
    kbMatchRapidDataTherapeuticIprCGeneric = await db.models.kbMatches.create(
      rapidDataTherapeuticIprCGeneric,
    );

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
      kbMatchRapidDataIprANotTherapeuticMsi,
      kbMatchRapidDataIprANotTherapeuticTmb,
    ];
    unknownSignificanceMatches = [
      kbMatchRapidDataIprAGeneric,
      kbMatchRapidDataTherapeuticIprCGeneric,
    ];
    excludedMatches = [
      kbMatchRapidDataExp,
      kbMatchRapidDataAlreadyReported,
    ];

    therapeuticAssociationVariants = [
      rapidVariantTA,
    ];
    cancerRelevanceVariants = [
      rapidVariantCR,
      rapidVariantMsi,
      rapidVariantTmb,
    ];
    unknownSignificanceVariants = [
      rapidVariantUSOncogene,
      rapidVariantUStumourSuppressor,
      rapidVariantUSAllTrue,
      rapidVariantTAGeneric,
      rapidVariantCRGeneric,
    ];
    excludedVariants = [rapidVariantUSAllFalse, rapidVariantMss];
  }, LONGER_TIMEOUT);

  describe('GET', () => {
    test('Getting Therapeutic Association - OK', async () => {
      const res = await request
        .get(`/api/reports/${rapidReport.ident}/variants`)
        .query({rapidTable: 'therapeuticAssociation'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      checkVariants(res.body[0]);

      checkVariantsFilter(
        res.body,
        therapeuticAssociationVariants,
        [...cancerRelevanceVariants, ...excludedVariants, ...unknownSignificanceVariants],
      );
      checkRapidReportMatches(
        res.body,
        therapeuticAssociationMatches,
        [...cancerRelevanceMatches, ...excludedMatches],
      );
    });

    test('Getting Cancer Relevance - OK', async () => {
      const res = await request
        .get(`/api/reports/${rapidReport.ident}/variants`)
        .query({rapidTable: 'cancerRelevance'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      checkVariants(res.body[0]);

      checkVariantsFilter(
        res.body,
        cancerRelevanceVariants,
        [...therapeuticAssociationVariants, ...excludedVariants, ...unknownSignificanceVariants],
      );
      checkRapidReportMatches(
        res.body,
        cancerRelevanceMatches,
        [...therapeuticAssociationMatches, ...excludedMatches, ...unknownSignificanceVariants],
      );
    });

    test('Getting Unknown Significance - OK', async () => {
      const res = await request
        .get(`/api/reports/${rapidReport.ident}/variants`)
        .query({rapidTable: 'unknownSignificance'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      checkVariants(res.body[0]);

      checkVariantsFilter(
        res.body,
        unknownSignificanceVariants,
        [...therapeuticAssociationVariants, ...excludedVariants, ...cancerRelevanceVariants],
      );

      checkRapidReportMatches(
        res.body,
        unknownSignificanceMatches,
        [...therapeuticAssociationMatches, ...excludedMatches, cancerRelevanceMatches],
      );
    });
  });

  // delete report
  afterAll(async () => {
    await db.models.report.destroy({where: {id: rapidReport.id}, force: true});
  }, LONGER_TIMEOUT);
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
