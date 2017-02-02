"use strict";

// /tests/procedures/loadPog.js

process.env.NODE_ENV = 'test';

let chai = require('chai'),
    chaiHttp = require('chai-http'),
    server = require(process.cwd() + '/server.js'),
    should = chai.should();
    
    
chai.use(chaiHttp);

// Attempt to onboard/load non-existent POG
describe('/GET summary/patientInformation', () => {
  it('Load patient information', (done) => {
    chai.request(server)
      .get('/api/1.0/POG/POG129/summary/patientInformation')
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.have.property('ident');
        res.body.should.have.property('physician');
        res.body.should.have.property('age');
        res.body.should.have.property('POGID');
        res.body.should.have.property('tumourType');
        res.body.should.have.property('reportDate');
        res.body.should.have.property('biopsySite');
        res.body.should.have.property('createdAt');
        res.body.should.have.property('updatedAt');
        
        done();
      });
  });
});

