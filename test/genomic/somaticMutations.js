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
describe('/GET SomaticMutations/SmallMutations', () => {
  it('Get small somatic mutations', (done) => {
    chai.request(server)
      .get('/api/1.0/POG/POG684/genomic/somaticMutations/smallMutations')
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('array');
        res.body.should.all.have.property('ident');
        res.body.should.all.have.property('dataVersion');
        res.body.should.all.have.property('mutationType');
        res.body.should.all.have.property('gene');
        res.body.should.all.have.property('transcript');
        res.body.should.all.have.property('proteinChange');
        res.body.should.all.have.property('location');
        res.body.should.all.have.property('refAlt');
        res.body.should.all.have.property('zygosity');
        res.body.should.all.have.property('ploidyCorrCpChange');
        res.body.should.all.have.property('lohState');
        res.body.should.all.have.property('tumourReads');
        res.body.should.all.have.property('RNAReads');
        res.body.should.all.have.property('expressionRpkm');
        res.body.should.all.have.property('foldChange');
        res.body.should.all.have.property('TCGAPerc');
        res.body.should.all.have.property('createdAt');
        res.body.should.all.have.property('updatedAt');

        done();
      });
  });
});

// Get Mutation Signature
describe('/GET SomaticMutations/MutationSignature', () => {
  it('Get mutation signature data', (done) => {
    chai.request(server)
      .get('/api/1.0/POG/POG684/genomic/somaticMutations/mutationSignature')
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('array');
        res.body.should.all.have.property('ident');
        res.body.should.all.have.property('dataVersion');
        res.body.should.all.have.property('signature');
        res.body.should.all.have.property('pearson');
        res.body.should.all.have.property('nnls');
        res.body.should.all.have.property('associations');
        res.body.should.all.have.property('features');
        res.body.should.all.have.property('numCancerTypes');
        res.body.should.all.have.property('cancerTypes');
        res.body.should.all.have.property('createdAt');
        res.body.should.all.have.property('updatedAt');

        done();
      });
  });
});