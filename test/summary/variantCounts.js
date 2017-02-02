"use strict";

// /tests/procedures/loadPog.js

process.env.NODE_ENV = 'test';

let chai = require('chai'),
    chaiHttp = require('chai-http'),
    server = require(process.cwd() + '/server.js'),
    should = chai.should();
    
    
chai.use(chaiHttp);

// Get variant counts information
describe('/GET summary/variantCounts', () => {
  it('Get variant counts details', (done) => {
    chai.request(server)
      .get('/api/1.0/POG/POG129/summary/variantCounts')
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.have.property('ident');
        res.body.should.have.property('smallMutations');
        res.body.should.have.property('CNVs');
        res.body.should.have.property('SVs');
        res.body.should.have.property('expressionOutliers');
        res.body.should.have.property('variantsUnknown');
        res.body.should.have.property('createdAt');
        res.body.should.have.property('updatedAt');
        
        done();
      });
  });
});

// Update variant counts details
describe('/PUT summary/variantCounts', () => {
  it('Update variant counts details', (done) => {
    
    let update = {
      "smallMutations": 4,
      "CNVs": 99,
      "SVs": 0,
      "expressionOutliers": 9,
      "variantsUnknown": 9,
    }
    
    chai.request(server)
      .put('/api/1.0/POG/POG129/summary/variantCounts')
      .send(update)
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.have.property('ident');
        res.body.should.have.property('smallMutations');
        res.body.should.have.property('CNVs', 99);
        res.body.should.have.property('SVs');
        res.body.should.have.property('expressionOutliers');
        res.body.should.have.property('variantsUnknown');
        res.body.should.have.property('createdAt');
        res.body.should.have.property('updatedAt');
        
        done();
      });
  });
});

