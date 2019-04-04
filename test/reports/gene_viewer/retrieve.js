"use strict";

const chai          = require('chai');
const chaiHttp      = require('chai-http');
const should        = chai.should();
const expect        = chai.expect;
const supertest     = require('supertest')

const api           = supertest('http://localhost:8081');


describe('Load Genomic Report', function() {
  
  
  it('Should return a 200 response and be an array with 2 results', function(done) {
    api.get('/api/1.0/reports?all=true&states=ready,active,presented&type=genomic')
      .set('Accept', 'application/json')
      .end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body.length).to.equal(2);
        expect(res.body).to.be.an('array');
        done();
      });
  });
  
  
  
});
