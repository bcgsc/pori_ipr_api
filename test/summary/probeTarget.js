"use strict";

// /tests/procedures/loadPog.js

process.env.NODE_ENV = 'test';

let chai = require('chai'),
    chaiHttp = require('chai-http'),
    server = require(process.cwd() + '/server.js'),
    should = chai.should();

// Testing a target
let probeTarget = {};
    
chai.use(chaiHttp);

// Get variant counts information
describe('/GET summary/probeTarget', () => {
  it('Get Probe Target variants', (done) => {
    chai.request(server)
      .get('/api/1.0/POG/POG684/summary/probeTarget')
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('array');
        res.body.should.all.have.property('ident');
        res.body.should.all.have.property('gene');
        res.body.should.all.have.property('variant');
        res.body.should.all.have.property('sample');
        res.body.should.all.have.property('createdAt');
        res.body.should.all.have.property('updatedAt');
        
        probeTarget = res.body[0];
        
        done();
      });
  });
});

// Update variant counts details
describe('/PUT summary/probeTarget', () => {
  it('Update probe target details', (done) => {
    
    let update = {
      gene: "AKT1 -- test-update",
      variant: "p.Q79K",
      sample: "POG684-OCT-1; POG684-OCT-1_trans"
    }
    
    chai.request(server)
      .put('/api/1.0/POG/POG684/summary/probeTarget/' + probeTarget.ident)
      .send(update)
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.have.property('ident');
        res.body.should.have.property('gene', 'AKT1 -- test-update');
        res.body.should.have.property('variant');
        res.body.should.have.property('sample');
        res.body.should.have.property('createdAt');
        res.body.should.have.property('updatedAt');
        
        done();
      });
  });
});

// Update variant counts details
describe('/DELETE summary/probeTarget', () => {
  it('Delete probe target details', (done) => {
        
    chai.request(server)
      .delete('/api/1.0/POG/POG684/summary/probeTarget/' + probeTarget.ident)
      .end((err, res) => {
        res.should.have.status(204);
        
        done();
      });
  });
});

