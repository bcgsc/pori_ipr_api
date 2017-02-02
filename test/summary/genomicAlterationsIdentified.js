"use strict";

// /tests/procedures/loadPog.js

process.env.NODE_ENV = 'test';

let chai = require('chai'),
    chaiHttp = require('chai-http'),
    server = require(process.cwd() + '/server.js'),
    should = chai.should();
    
    
chai.use(chaiHttp);
chai.use(require('chai-things'));

let ident;

// Get genomic alterations identified
describe('/GET summary/genomicAlterationsIdentified', () => {
  it('Get genomic alterations that have been identified', (done) => {
    chai.request(server)
      .get('/api/1.0/POG/POG129/summary/genomicAlterationsIdentified')
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('array');
        res.body.should.all.have.property('ident');
        res.body.should.all.have.property('geneVariant');
        res.body.should.all.have.property('createdAt');
        res.body.should.all.have.property('updatedAt');
        
        ident = res.body[0].ident;
        
        done();
      });
  });
});

// Update variant counts details
describe('/PUT summary/genomicAlterationsIdentified', () => {
  it('Update genomic alterations that have been identified', (done) => {
    
    let update = {
      "geneVariant": "AKT1 (p.Q79K) -- test-update",
    }
    
    chai.request(server)
      .put('/api/1.0/POG/POG129/summary/genomicAlterationsIdentified/'+ident)
      .send(update)
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.have.property('ident');
        res.body.should.have.property('geneVariant', 'AKT1 (p.Q79K) -- test-update');
        res.body.should.have.property('createdAt');
        res.body.should.have.property('updatedAt');
        
        done();
      });
  });
});

