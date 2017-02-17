"use strict";

// /tests/procedures/loadPog.js

process.env.NODE_ENV = 'test';

let chai = require('chai'),
  chaiHttp = require('chai-http'),
  server = require(process.cwd() + '/server.js'),
  should = chai.should(),
  Q = require('q');

// Create Setup Promise
let deferred = Q.defer();

chai.use(chaiHttp);

// Onboard/Loag POG129
describe('/GET loadPog', function() {

  this.slow(8000);

  console.log('Waiting for server to come up before starting tests.');

  it('It should load in the described POG', (done) => {
    setTimeout(() => {
      chai.request(server)
        .get('/api/1.0/POG/POG684/loadPog')
        .end((err, res) => {
          res.should.have.status(200);
          res.should.be.json;
          res.body.should.be.a('object');
          res.body.should.have.property('ident');
          res.body.should.have.property('POGID');
          res.body.should.have.property('updatedAt');
          res.body.should.have.property('createdAt');

          deferred.resolve(true);

          done();
        });
    },2000);
  });
});
/*
// Attempt to onboard/load non-existent POG
describe('/GET loadPog-Fail', () => {
  it('It should fail to load this POG', (done) => {
    chai.request(server)
      .get('/api/1.0/POG/POG250/loadPog')
      .end((err, res) => {
        res.should.have.status(400);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.have.property('error');

        done();
      });
  });
});
*/

// Return Promise
module.exports = deferred.promise;