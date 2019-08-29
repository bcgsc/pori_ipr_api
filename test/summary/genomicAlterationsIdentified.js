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
describe('/GET expressionAnalysis/Outliers', () => {
  it('Get Expression Analysis Outliers', (done) => {
    chai.request(server)
      .get('/api/1.0/POG/POG684/genomic/expressionAnalysis/outlier')
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('array');
        res.body.should.all.have.property('ident');
        res.body.should.all.have.property('outlierType');
        res.body.should.all.have.property('gene');
        res.body.should.all.have.property('location');
        res.body.should.all.have.property('copyChange');
        res.body.should.all.have.property('lohState');
        res.body.should.all.have.property('cnvState');
        res.body.should.all.have.property('rnaReads');
        res.body.should.all.have.property('rpkm');
        res.body.should.all.have.property('foldChange');
        res.body.should.all.have.property('tcgaPerc');
        res.body.should.all.have.property('createdAt');
        res.body.should.all.have.property('updatedAt');

        done();
      });
  });
});

// Get genomic alterations identified
describe('/GET expressionAnalysis/DrugTargets', () => {
  it('Get Expression Analysis Drug Targets', (done) => {
    chai.request(server)
      .get('/api/1.0/POG/POG684/genomic/expressionAnalysis/drugTarget')
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('array');
        res.body.should.all.have.property('ident');
        res.body.should.all.have.property('gene');
        res.body.should.all.have.property('copy');
        res.body.should.all.have.property('lohRegion');
        res.body.should.all.have.property('tcgaPerc');
        res.body.should.all.have.property('foldChange');
        res.body.should.all.have.property('drugOptions');
        res.body.should.all.have.property('kIQR');
        res.body.should.all.have.property('kIQRColumn');
        res.body.should.all.have.property('kIQRNormal');
        res.body.should.all.have.property('kIQRNormalColumn');
        res.body.should.all.have.property('createdAt');
        res.body.should.all.have.property('updatedAt');

        done();
      });
  });
});
