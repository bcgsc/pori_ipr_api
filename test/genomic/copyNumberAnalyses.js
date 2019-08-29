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
describe('/GET CopyNumberAnalyses/CNV', () => {
  it('Get copy number variants', (done) => {
    chai.request(server)
      .get('/api/1.0/POG/POG684/genomic/copyNumberAnalyses/cnv')
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('array');
        res.body.should.all.have.property('ident');
        res.body.should.all.have.property('cnvVariant');
        res.body.should.all.have.property('gene');
        res.body.should.all.have.property('ploidyCorrCpChange');
        res.body.should.all.have.property('lohState');
        res.body.should.all.have.property('cnvState');
        res.body.should.all.have.property('chromosomeBand');
        res.body.should.all.have.property('start');
        res.body.should.all.have.property('end');
        res.body.should.all.have.property('size');
        res.body.should.all.have.property('expressionRpkm');
        res.body.should.all.have.property('foldChange');
        res.body.should.all.have.property('tcgaPerc');
        res.body.should.all.have.property('createdAt');
        res.body.should.all.have.property('updatedAt');

        ident = res.body[0].ident;

        done();
      });
  });
});

// Update variant counts details
describe('/PUT CopyNumberAnalyses/CNV', () => {
  it('Update copy number analyses CNV', (done) => {

    let update = {
      "cnvVariant": "nostic",
      "gene": "ACTN4 -- updated",
      "ploidyCorrCpChange": 1,
      "lohState": "HET",
      "cnvState": "Gain",
      "chromosomeBand": "19:q13.12-q13.2",
      "start": 37601047,
      "end": 39514598,
      "size": 1.91,
      "expressionRpkm": 145.34,
      "foldChange": 1.7,
      "tcgaPerc": 72
    }

    chai.request(server)
      .put('/api/1.0/POG/POG684/genomic/copyNumberAnalyses/cnv/'+ident)
      .send(update)
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.have.property('ident');
        res.body.should.have.property('cnvVariant');
        res.body.should.have.property('gene', 'ACTN4 -- updated');
        res.body.should.have.property('ploidyCorrCpChange');
        res.body.should.have.property('lohState');
        res.body.should.have.property('cnvState');
        res.body.should.have.property('chromosomeBand');
        res.body.should.have.property('start');
        res.body.should.have.property('end');
        res.body.should.have.property('size');
        res.body.should.have.property('expressionRpkm');
        res.body.should.have.property('foldChange');
        res.body.should.have.property('tcgaPerc');
        res.body.should.have.property('createdAt');
        res.body.should.have.property('updatedAt');

        done();
      });
  });
});

