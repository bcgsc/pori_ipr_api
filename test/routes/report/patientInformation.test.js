const getPort = require('get-port');
const supertest = require('supertest');
const HTTP_STATUS = require('http-status-codes');

const db = require('../../../app/models');
// get test user info
const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

const PATIENT_INFORMATION_DATA = {
  physician: 'TEST DOCTOR',
  gender: 'MALE',
  age: '100',
  caseType: 'TEST CASE TYPE',
  diagnosis: 'TEST DIAGNOSIS',
  reportDate: 'TEST DATE',
  biopsySite: 'TEST SITE',
  tumourSample: 'TEST SAMPLE',
  tumourProtocol: 'TEST PROTOCOL',
  constitutionalSample: 'TEST SAMPLE',
  constitutionalProtocol: 'TEST CONS. PROTOCOL',
  internalPancancerCohort: 'TEST PANCANCER COHORT',
};

const PATIENT_INFORMATION_UPDATE_DATA = {
  physician: 'UPDATED DOCTOR',
  gender: 'FEMALE',
  age: '50',
  caseType: 'UPDATED CASE TYPE',
  diagnosis: 'UPDATED DIAGNOSIS',
  reportDate: 'UPDATED DATE',
  biopsySite: 'UPDATED SITE',
  tumourSample: 'UPDATED SAMPLE',
  tumourProtocol: 'UPDATED PROTOCOL',
  constitutionalSample: 'UPDATED SAMPLE',
  constitutionalProtocol: 'UPDATED CONS. PROTOCOL',
  internalPancancerCohort: 'UPDATED PANCANCER COHORT',
};

const patientInformationProperties = [
  'ident', 'createdAt', 'physician', 'gender', 'age', 'caseType',
  'diagnosis', 'reportDate', 'biopsySite', 'tumourSample',
  'tumourProtocol', 'constitutionalSample', 'constitutionalProtocol',
  'internalPancancerCohort',
];

const checkPatientInformation = (patientInformationObject) => {
  patientInformationProperties.forEach((element) => {
    expect(patientInformationObject).toHaveProperty(element);
  });
  expect(patientInformationObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    reportId: expect.any(Number),
    updatedBy: expect.any(Number),
    deletedAt: expect.any(String),
  }));
};

let server;
let request;

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/reports/{report}/patient-information', () => {
  let report;

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // Create report
    report = await db.models.report.create({
      templateId: template.id,
      patientId: 'PATIENT_INFORMATION_PATIENT',
    });
  });

  afterAll(async () => {
    return report.destroy({force: true});
  });

  describe('GET', () => {
    let getPatientInformation;

    beforeEach(async () => {
      getPatientInformation = await db.models.patientInformation.create({
        ...PATIENT_INFORMATION_DATA, reportId: report.id,
      });
    });

    afterEach(async () => {
      return db.models.patientInformation.destroy({
        where: {ident: getPatientInformation.ident},
        force: true,
      });
    });

    test('/ - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/patient-information`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();
      checkPatientInformation(res.body);
    });

    test('/ - 404 Not Found', async () => {
      // Remove patient information
      await getPatientInformation.destroy();

      await request
        .get(`/api/reports/${report.ident}/patient-information`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('PUT', () => {
    let putPatientInformation;

    beforeEach(async () => {
      putPatientInformation = await db.models.patientInformation.create({
        ...PATIENT_INFORMATION_DATA, reportId: report.id,
      });
    });

    afterEach(async () => {
      return putPatientInformation.destroy({force: true});
    });

    test('/ - 200 Success', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}/patient-information`)
        .send(PATIENT_INFORMATION_UPDATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();
      checkPatientInformation(res.body);
      expect(res.body).toEqual(expect.objectContaining(PATIENT_INFORMATION_UPDATE_DATA));
    });

    test('/ - 400 Bad Request - Additional Property', async () => {
      await request
        .put(`/api/reports/${report.ident}/patient-information`)
        .send({
          ...PATIENT_INFORMATION_UPDATE_DATA,
          additionalProperty: 'ADDITIONAL_PROPERTY',
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 400 Bad Request - Incorrect field type', async () => {
      await request
        .put(`/api/reports/${report.ident}/patient-information`)
        .send({
          ...PATIENT_INFORMATION_UPDATE_DATA,
          age: {
            key: 'VALUE',
          },
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
