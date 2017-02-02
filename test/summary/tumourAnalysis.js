"use strict";

// /tests/procedures/loadPog.js

process.env.NODE_ENV = 'test';

let chai = require('chai'),
    chaiHttp = require('chai-http'),
    server = require(process.cwd() + '/server.js'),
    should = chai.should();
    
    
chai.use(chaiHttp);

// Get tumour analysis information
describe('/GET summary/tumourAnalysis', () => {
  it('Get tumour analysis', (done) => {
    chai.request(server)
      .get('/api/1.0/POG/POG129/summary/tumourAnalysis')
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.have.property('ident');
        res.body.should.have.property('tumourContent');
        res.body.should.have.property('ploidy');
        res.body.should.have.property('normalExpressionComparator');
        res.body.should.have.property('diseaseExpressionComparator');
        res.body.should.have.property('subtyping');
        res.body.should.have.property('tcgaColor');
        res.body.should.have.property('createdAt');
        res.body.should.have.property('updatedAt');
        
        done();
      });
  });
});

// Attempt to onboard/load non-existent POG
describe('/PUT summary/tumourAnalysis', () => {
  it('Update tumour anaylsis', (done) => {
    
    let update = {
      "tumourContent": 31,
      "ploidy": "diploid/tetraploid",
      "normalExpressionComparator": "colon",
      "diseaseExpressionComparator": "COADREAD",
      "subtyping": "test-subtype",
      "tcgaColor": "0xDECBFF"
    }
    
    chai.request(server)
      .put('/api/1.0/POG/POG129/summary/tumourAnalysis')
      .send(update)
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.have.property('ident');
        res.body.should.have.property('tumourContent');
        res.body.should.have.property('ploidy');
        res.body.should.have.property('normalExpressionComparator');
        res.body.should.have.property('diseaseExpressionComparator');
        res.body.should.have.property('subtyping', 'test-subtype');
        res.body.should.have.property('tcgaColor');
        res.body.should.have.property('createdAt');
        res.body.should.have.property('updatedAt');
        
        done();
      });
  });
});

