"use strict";

// /tests/procedures/loadPog.js

process.env.NODE_ENV = 'test';

let chai = require('chai'),
    chaiHttp = require('chai-http'),
    server = require(process.cwd() + '/server.js'),
    should = chai.should();
    
    
chai.use(chaiHttp);

// Get mutation summary information
describe('/GET summary/mutationSummary', () => {
  it('Get mutation summary', (done) => {
    chai.request(server)
      .get('/api/1.0/POG/POG129/summary/mutationSummary')
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.have.property('ident');
        res.body.should.have.property('mutationSignature');
        res.body.should.have.property('totalSNV');
        res.body.should.have.property('totalIndel');
        res.body.should.have.property('totalSV');
        res.body.should.have.property('snvPercentileTCGA');
        res.body.should.have.property('snvPercentileDisease');
        res.body.should.have.property('indelPercentileTCGA');
        res.body.should.have.property('indelPercentileDisease');
        res.body.should.have.property('svPercentilePOG');
        res.body.should.have.property('totalSV');
        res.body.should.have.property('snvPercentileTCGACategory');
        res.body.should.have.property('snvPercentileDiseaseCategory');
        res.body.should.have.property('indelPercentileTCGACategory');
        res.body.should.have.property('indelPercentileDiseaseCategory');
        res.body.should.have.property('snvReportCategory');
        res.body.should.have.property('indelReportCategory');
        res.body.should.have.property('createdAt');
        res.body.should.have.property('updatedAt');
        
        done();
      });
  });
});

// Attempt to onboard/load non-existent POG
describe('/PUT summary/mutationSummary', () => {
  it('Update mutation summary', (done) => {
    
    let update = {
      "mutationSignature": "test-value",
      "totalSNV": "62 [3]",
      "totalIndel": "4 [2]",
      "totalSV": "18 [5]",
      "snvPercentileTCGA": 62,
      "snvPercentileDisease": 23,
      "indelPercentileTCGA": 60,
      "indelPercentileDisease": 31,
      "svPercentilePOG": 6,
      "snvPercentileTCGACategory": "MODERATE",
      "snvPercentileDiseaseCategory": "LOW",
      "indelPercentileTCGACategory": "MODERATE",
      "indelPercentileDiseaseCategory": "MODERATE",
      "svPercentilePOGCategory": "LOW",
      "snvReportCategory": "LOW",
      "indelReportCategory": "MODERATE"
    }
    
    chai.request(server)
      .put('/api/1.0/POG/POG129/summary/mutationSummary')
      .send(update)
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json
        res.body.should.be.a('object');
        res.body.should.have.property('ident');
        res.body.should.have.property('mutationSignature', 'test-value');
        res.body.should.have.property('totalSNV');
        res.body.should.have.property('totalIndel');
        res.body.should.have.property('totalSV');
        res.body.should.have.property('snvPercentileTCGA');
        res.body.should.have.property('snvPercentileDisease');
        res.body.should.have.property('indelPercentileTCGA');
        res.body.should.have.property('indelPercentileDisease');
        res.body.should.have.property('svPercentilePOG');
        res.body.should.have.property('totalSV');
        res.body.should.have.property('snvPercentileTCGACategory');
        res.body.should.have.property('snvPercentileDiseaseCategory');
        res.body.should.have.property('indelPercentileTCGACategory');
        res.body.should.have.property('indelPercentileDiseaseCategory');
        res.body.should.have.property('snvReportCategory');
        res.body.should.have.property('indelReportCategory');
        res.body.should.have.property('createdAt');
        res.body.should.have.property('updatedAt');
        
        done();
      });
  });
});

