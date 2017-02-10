"use strict";

// /tests/procedures/loadPog.js

process.env.NODE_ENV = 'test';

let chai = require('chai'),
  chaiHttp = require('chai-http'),
  server = require(process.cwd() + '/server.js'),
  should = chai.should();


chai.use(chaiHttp);
chai.use(require('chai-things'));

// Get genomic alterations identified
describe('/GET StructuraVariation/sv', () => {
  it('Get all Structural Variation Variants', (done) => {
    chai.request(server)
      .get('/api/1.0/POG/POG684/genomic/structuralVariation/sv')
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('array');
        res.body.should.all.have.property('ident');
        res.body.should.all.have.property('dataVersion');
        res.body.should.all.have.property('svVariant');
        res.body.should.all.have.property('genes');
        res.body.should.all.have.property('exons');
        res.body.should.all.have.property('breakpoint');
        res.body.should.all.have.property('eventType');
        res.body.should.all.have.property('detectedIn');
        res.body.should.all.have.property('conventionalName');
        res.body.should.all.have.property('rpkm');
        res.body.should.all.have.property('foldChange');
        res.body.should.all.have.property('tcgaPerc');
        res.body.should.all.have.property('svg');
        res.body.should.all.have.property('svgTitle');
        res.body.should.all.have.property('name');
        res.body.should.all.have.property('frame');
        res.body.should.all.have.property('ctermGene');
        res.body.should.all.have.property('ntermGene');
        res.body.should.all.have.property('ctermTranscript');
        res.body.should.all.have.property('ntermTranscript');
        res.body.should.all.have.property('createdAt');
        res.body.should.all.have.property('updatedAt');

        done();
      });
  });
});