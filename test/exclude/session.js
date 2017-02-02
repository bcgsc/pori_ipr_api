"use strict";

// /tests/procedures/loadPog.js

let chai = require('chai'),
    chaiHttp = require('chai-http'),
    server = require(process.cwd() + '/server.js'),
    should = chai.should();
    
    
chai.use(chaiHttp);

let token;

// Get variant counts information
describe('/POST session', () => {
  it('Get variant counts details', (done) => {
    chai.request(server)
      .post('/api/1.0/session')
      .send({username: 'admin', password: 'admin'})
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.not.have.property('password');
        res.body.should.not.have.property('id');
        res.body.should.have.property('ident');
        res.body.should.have.property('username');
        res.body.should.have.property('firstName');
        res.body.should.have.property('lastName');
        res.body.should.have.property('email');
        res.body.should.have.property('access');
        res.body.should.have.property('type');
        res.should.have.header('x-token');
        
        token = res.headers['x-token'];
        
        done();
      });
  });
});

// Get variant counts information
describe('/POST session-badlogin', () => {
  it('Failed login attempt', (done) => {
    chai.request(server)
      .post('/api/1.0/session')
      .send({username: 'admin', password: 'test-admin-bad-password'})
      .end((err, res) => {
        res.should.have.status(400);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.have.property('error');
        res.body['error'].should.have.property('code','invalidCredentials');
        
        done();
      });
  });
});

// Test Logout
describe('/DELETE Session logout', () => {
  it('Attempt to logout', (done) => {
    chai.request(server)
      .delete('/api/1.0/session')
      .set('Authorization', token)
      .end((err, res) => {
        res.should.have.status(204);
        
        done();
      });
  });
});
