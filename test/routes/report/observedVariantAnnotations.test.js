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

// TODO ADD TESTS
// - creates a new record for variant
// gets existing record variant from variants route
// does not create a new record when variant doesn't exist
// does not create a new record when there is already an annotation record for the variant
// put
// test that variants endpoints for rapid report categorizes variants differently
// based on annotation tag first


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

// Tests for /kb-matches endpoint
describe('/reports/{REPORTID}/observed-variant-annotations', () => {
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

  describe('POST', () => {
    test('Create new annotation - OK', async () => {
      const res = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'therapeuticAssociation'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      const allvars = res.body.filter((variant) => {
        return variant.variantType === 'cnv'; // choose a random nontherapeutic example
    })

      const variant = allvars[0];
      const res2 = await request
        .post(`/api/reports/${rapidReportIdent.ident}/observed-variant-annotations`)
        .auth(username, password)
        .type('json')
        .send({
          variantType: 'cnv',
          variantIdent: variant.ident,
          annotations: {'rapidReportTableTag': 'cancerRelevance'},
          comment: 'test'
        })
        .expect(HTTP_STATUS.CREATED);

    const allCRVars = await request
    .get(`/api/reports/${rapidReportIdent.ident}/variants`)
    .query({rapidTable: 'cancerRelevance'})
    .auth(username, password)
    .type('json')
    .expect(HTTP_STATUS.OK);

    const checkVar = allCRVars.body.filter((item) => {
        return item.ident == variant.ident
    });
    expect(checkVar.length).toEqual(1);
    const annotation = checkVar[0].observedVariantAnnotation
    expect(annotation.variantType).toEqual('cnv');
    expect(annotation.comment).toEqual('test');
    expect(annotation.annotations.rapidReportTableTag).toEqual('cancerRelevance');
});


  test('Does not create new annotation with no matching variant - OK', async () => {
    const res2 = await request
      .post(`/api/reports/${rapidReportIdent.ident}/observed-variant-annotations`)
      .auth(username, password)
      .type('json')
      .send({
        variantType: 'mut',
        variantIdent: 'hello',
        annotations: {'rapidReportTableTag': 'therapeutic'},
        comment: 'test'
      })
      .expect(HTTP_STATUS.BAD_REQUEST);

    });

    // TODO: this test is not actually checking the variant type check
    test('Does not create new annotation with fake variant type- OK', async () => {
        const res2 = await request
          .post(`/api/reports/${rapidReportIdent.ident}/observed-variant-annotations`)
          .auth(username, password)
          .type('json')
          .send({
            variantType: 'test',
            variantIdent: 'hello',
            annotations: {'rapidReportTableTag': 'therapeutic'},
            comment: 'test'
          })
          .expect(HTTP_STATUS.BAD_REQUEST);
        });

    test('Does not create new annotation when variant already has one - OK', async () => {

        const res = await request
            .get(`/api/reports/${rapidReportIdent.ident}/variants`)
            .query({rapidTable: 'unknownSignificance'})
            .auth(username, password)
            .type('json')
            .expect(HTTP_STATUS.OK);

        const allvars = res.body.filter((variant) => {
            return variant.variantType === 'mut';
            })

        const variant = allvars[0];
        const res2 = await request
            .post(`/api/reports/${rapidReportIdent.ident}/observed-variant-annotations`)
            .auth(username, password)
            .type('json')
            .send({
            variantType: 'mut',
            variantIdent: variant.ident,
            annotations: {'rapidReportTableTag': 'therapeutic'},
            comment: 'test'
            })
            .expect(HTTP_STATUS.CREATED);

        const res3 = await request
        .post(`/api/reports/${rapidReportIdent.ident}/observed-variant-annotations`)
        .auth(username, password)
        .type('json')
        .send({
        variantType: 'mut',
        variantIdent: variant.ident,
        annotations: {'rapidReportTableTag': 'cancerRelevance'},
        comment: 'test2'
        })
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
});

  describe('PUT', () => {
    test('Update existing annotation - comment field - OK', async () => {

        const res = await request
            .get(`/api/reports/${rapidReportIdent.ident}/variants`)
            .query({rapidTable: 'unknownSignificance'})
            .auth(username, password)
            .type('json')
            .expect(HTTP_STATUS.OK);

        const allvars = res.body.filter((variant) => {
            return variant.variantType === 'mut';
            })

        const variant = allvars[0];
        const res1 = await request
            .post(`/api/reports/${rapidReportIdent.ident}/observed-variant-annotations`)
            .auth(username, password)
            .type('json')
            .send({
            variantType: 'mut',
            variantIdent: variant.ident,
            annotations: {'rapidReportTableTag': 'therapeutic'},
            comment: 'test'
            })
            .expect(HTTP_STATUS.CREATED);

            // TODO check that it's present in this list
            const res2 = await request
            .get(`/api/reports/${rapidReportIdent.ident}/variants`)
            .query({rapidTable: 'therapeuticAssociation'})
            .auth(username, password)
            .type('json')
            .expect(HTTP_STATUS.OK);


            const checkVar1 = res2.body.filter((item) => {
                return item.ident == variant.ident
            });
        const res3 = await request
        .put(`/api/reports/${rapidReportIdent.ident}/observed-variant-annotations/${checkVar1[0].observedVariantAnnotation.ident}`)
        .auth(username, password)
        .type('json')
        .send({
        annotations: {'rapidReportTableTag': 'cancerRelevance'},
        comment: 'test2'
        })
        .expect(HTTP_STATUS.OK);

        // TODO check that it's updated
        const res4 = await request
        .get(`/api/reports/${rapidReportIdent.ident}/variants`)
        .query({rapidTable: 'cancerRelevance'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);
        const checkVar2 = res4.body.filter((item) => {
            return item.ident == variant.ident
        });
        console.dir(checkVar1[0].observedVariantAnnotation);
        console.dir(checkVar2[0].observedVariantAnnotation);

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
