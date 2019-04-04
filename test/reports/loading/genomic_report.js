"use strict";

const chai          = require('chai');
const chaiHttp      = require('chai-http');
const should        = chai.should();
const expect        = chai.expect;
const supertest     = require('supertest')

const api           = supertest('http://localhost:8082');

/*
describe('Load Genomic Report', function() {
  
  
  it('Should return a 200 response', function(done) {
  
  
  });
  
});
*/