"use strict";

// /tests/procedures/loadPog.js

process.env.NODE_ENV = 'test';

let chai = require('chai'),
    chaiHttp = require('chai-http'),
    server = require(process.cwd() + '/server.js'),
    should = chai.should();
    
    
chai.use(chaiHttp);

// Check for valid POG
describe('/GET POG', () => {
  it('Retrieve previously loaded POG', (done) => {
    
    chai.request(server)
      .get('/api/1.0/POG/POG684')
      .end((err, res) => {
        
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.have.property('ident');
        res.body.should.have.property('POGID', 'POG684');
        
        res.body.should.have.property('patientInformation');
        res.body.patientInformation.should.have.property('physician');
        res.body.patientInformation.should.have.property('gender');
        res.body.patientInformation.should.have.property('age');
        res.body.patientInformation.should.have.property('tumourType');
        res.body.patientInformation.should.have.property('reportDate');
        res.body.patientInformation.should.have.property('biopsySite');
        
        res.body.should.have.property('tumourAnalysis');
        res.body.tumourAnalysis.should.have.property('tumourContent');
        res.body.tumourAnalysis.should.have.property('ploidy');
        res.body.tumourAnalysis.should.have.property('normalExpressionComparator');
        res.body.tumourAnalysis.should.have.property('diseaseExpressionComparator');
        res.body.tumourAnalysis.should.have.property('subtyping');
        res.body.tumourAnalysis.should.have.property('tcgaColor');
        
        res.body.should.have.property('updatedAt');
        res.body.should.have.property('createdAt');
        
        done();
      });
    
  });
});

// Check for not found POG
describe('/GET POG-Fail', () => {
  it('Fail to retrieve POG', (done) => {
    chai.request(server)
      .get('/api/1.0/POG/POG000')
      .end((err, res) => {
        res.should.have.status(404);
        res.should.be.json;
        res.body.should.have.property('error');
        done();
      });
  });
});

// Get All POGs
describe('/GET All-Pogs', () => {
  it('Get all POGs available for user', (done) => {
    
    chai.request(server)
      .get('/api/1.0/POG')
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('array');
        res.body.should.all.have.property('ident');
        res.body.should.all.have.property('POGID');
        
        res.body.should.all.have.property('patientInformation');
        res.body[0].patientInformation.should.have.property('physician');
        res.body[0].patientInformation.should.have.property('gender');
        res.body[0].patientInformation.should.have.property('age');
        res.body[0].patientInformation.should.have.property('tumourType');
        res.body[0].patientInformation.should.have.property('reportDate');
        res.body[0].patientInformation.should.have.property('biopsySite');
        
        res.body.should.all.have.property('tumourAnalysis');
        res.body[0].tumourAnalysis.should.have.property('tumourContent');
        res.body[0].tumourAnalysis.should.have.property('ploidy');
        res.body[0].tumourAnalysis.should.have.property('normalExpressionComparator');
        res.body[0].tumourAnalysis.should.have.property('diseaseExpressionComparator');
        res.body[0].tumourAnalysis.should.have.property('subtyping');
        res.body[0].tumourAnalysis.should.have.property('tcgaColor');
        
        done();
      });
    
  });
  
});
