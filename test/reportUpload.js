process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const uuidv4 = require('uuid/v4');
const getPort = require('get-port');

chai.should();

chai.use(chaiHttp);
chai.use(require('chai-things'));

// get test user info
const CONFIG = require('../app/config');
const {listen} = require('../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

// Test patient ??Don't think I need a unique patient each time
const testPatient = 'UPLOADTESTPATIENT001';

const uploadConfig = {
  project: 'TEST',
  baseDir: '/projects/vardb/integration_testing/ipr/UPLOADTESTPATIENT001/Report_tracking.cfg',
  // loader_config: '', // optional or uses ${project}_${type} (project is test and type is genomic for the test)
  // loaders: '', // ?? Don't think I need this
  profile: 'test_genomic', //??
};

//??get info to load into report

let server;
// Start API
before(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
});

// Tests history changes and update changes
describe('Test Uploading a Report', () => {
  let reportIdent;

  it('Test Report Upload', async () => {
    // Upload test report
    let res = await chai.request(server)
      .post(`/api/1.0/POG/${testPatient}/load/genomic`)
      .auth(username, password)
      .type('json')
      .send({...uploadConfig});

    res.should.have.status(200);
    reportIdent = res.ident;

    //??get report ident

    // get updated project and compare to update values
    res = await chai.request(server)
      .get(`/api/1.0/reports/${reportIdent}`)
      .auth(username, password)
      .type('json');

    res.should.have.status(200);

    // Test all values are equal

    // check fields of returned report
    res.body.ident.should.equal();
    res.body.pog_id.should.equal();
    res.body.createdBy_id.should.equal();
    res.body.type.should.equal();
    res.body.sampleInfo.should.equal();
    res.body.seqQC.should.equal();
    res.body.config.should.equal();
    res.body.reportVersion.should.equal();
    res.body.kbVersion.should.equal();
    res.body.state.should.equal();
    res.body.expression_matrix.should.equal();

    // check fields of patientInformation
    res.body.patientInformation.physician.should.equal();
    res.body.patientInformation.gender.should.equal();
    res.body.patientInformation.age.should.equal();
    res.body.patientInformation.POGID.should.equal();
    res.body.patientInformation.caseType.should.equal();
    res.body.patientInformation.tumourType.should.equal();
    res.body.patientInformation.reportDate.should.equal();
    res.body.patientInformation.biopsySite.should.equal();
    res.body.patientInformation.tumourSample.should.equal();
    res.body.patientInformation.tumourProtocol.should.equal();
    res.body.patientInformation.constitutionalSample.should.equal();
    res.body.patientInformation.constitutionalProtocol.should.equal();

    // check fields of tumourAnalysis
    res.body.tumourAnalysis.tumourContent.should.equal();
    res.body.tumourAnalysis.ploidy.should.equal();
    res.body.tumourAnalysis.normalExpressionComparator.should.equal();
    res.body.tumourAnalysis.diseaseExpressionComparator.should.equal();
    res.body.tumourAnalysis.subtyping.should.equal();
    res.body.tumourAnalysis.tcgaColor.should.equal();
    res.body.tumourAnalysis.mutationSignature.should.equal();

    // check fields of pog
    res.body.pog.POGID.should.equal();
    res.body.pog.nonPOG.should.equal();
    res.body.pog.project.should.equal();
    res.body.pog.alternate_identifier.should.equal();
    res.body.pog.age_of_consent.should.equal();

    // check fields of createdBy
    res.body.createdBy.username.should.equal();

    // check fields of analysis
    res.body.analysis.analysis_biopsy.should.equal();

    // res.body.should.be.a('array');
    // res.body = res.body[0];

    // // Should equal updated values
    // res.body.name.should.equal(update.name);
  });
});

after(async () => {
  await server.close();
});
