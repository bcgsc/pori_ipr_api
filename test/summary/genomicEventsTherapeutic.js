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

// Get variant counts information
describe('/GET summary/genomicEventsTherapeutic', () => {
  it('Get genomic events with therapeutic association', (done) => {
    chai.request(server)
      .get('/api/1.0/POG/POG684/summary/genomicEventsTherapeutic')
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('array');
        res.body.should.all.have.property('ident');
        res.body.should.all.have.property('genomicEvent');
        res.body.should.all.have.property('approvedThisCancerType');
        res.body.should.all.have.property('approvedOtherCancerType');
        res.body.should.all.have.property('emergingPreclinicalEvidence');
        res.body.should.all.have.property('comments');
        res.body.should.all.have.property('createdAt');
        res.body.should.all.have.property('updatedAt');
        
        ident = res.body[0].ident;
        
        done();
      });
  });
});

// Update variant counts details
describe('/PUT summary/genomicEventsTherapeutic', () => {
  it('Update genomic events with therapeutic association', (done) => {
    
    let update = {
      "genomicEvent": "AKT1 (p.Q79K)",
      "approvedThisCancerType": "",
      "approvedOtherCancerType": "",
      "emergingPreclinicalEvidence": "resistance",
      "comments": "test-update"
    }
    
    chai.request(server)
      .put('/api/1.0/POG/POG684/summary/genomicEventsTherapeutic/'+ident)
      .send(update)
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.have.property('ident');
        res.body.should.have.property('genomicEvent');
        res.body.should.have.property('approvedThisCancerType');
        res.body.should.have.property('approvedOtherCancerType');
        res.body.should.have.property('emergingPreclinicalEvidence');
        res.body.should.have.property('comments', 'test-update');
        res.body.should.have.property('createdAt');
        res.body.should.have.property('updatedAt');
        
        done();
      });
  });
});

