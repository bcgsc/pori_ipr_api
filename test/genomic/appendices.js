"use strict";

// /tests/procedures/loadPog.js

process.env.NODE_ENV = 'test';

let chai = require('chai'),
  chaiHttp = require('chai-http'),
  server = require(process.cwd() + '/server.js'),
  should = chai.should();


chai.use(chaiHttp);

// Attempt to onboard/load non-existent POG
describe('/GET appendices/tcga', () => {
  it('Load TCGA Acronyms', (done) => {
    chai.request(server)
      .get('/api/1.0/POG/POG684/genomic/appendices/tcga')
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('array');
        res.body.should.all.have.property('Full Name');
        res.body.should.all.have.property('Code Name');

        done();
      });
  });
});

