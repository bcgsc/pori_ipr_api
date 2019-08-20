process.env.NODE_ENV = 'local';

const chai = require('chai');
const chaiHttp = require('chai-http');

chai.should();

chai.use(chaiHttp);
chai.use(require('chai-things'));

let CONFIG;
try {
  CONFIG = require('/var/www/ipr/api/persist/.env.json');
  CONFIG = CONFIG[process.env.NODE_ENV] || CONFIG;
} catch (error) {
  CONFIG = require('../.env.json')[process.env.NODE_ENV];
}

const {username, password} = CONFIG.test.user;

// Data for copy number analysis update
const update = {
  cnvVariant: 'biological',
  gene: 'forsenCD -- updated',
  ploidyCorrCpChange: 1,
  lohState: 'Speed',
  cnvState: 'Violence',
  chromosomeBand: 'Momentum',
  start: 37601047,
  end: 39514598,
  size: 2.78,
  expressionRpkm: 148.34,
  foldChange: 1.8,
  tcgaPerc: 74,
};

let server;
// Start API
before(async () => {
  server = await require('../app.js');
});

// Tests history changes and for update changes
describe('Tests for update changes', () => {
  let ident;
  // Get a copy number analysis record to perform an update on
  it('Get a copy number analysis', (done) => {
    chai.request(server)
      .get('/api/1.0/POG/POG684/report/TV83Z/genomic/copyNumberAnalyses/cnv')
      .auth(username, password)
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

  // Update copy number analysis details for given ident
  it('Update copy number analysis', (done) => {
    chai.request(server)
      .put(`/api/1.0/POG/POG684/report/TV83Z/genomic/copyNumberAnalyses/cnv/${ident}`)
      .auth(username, password)
      .send(update)
      .end((err, res) => {
        res.should.have.status(200);
        done();
      });
  });

  // Get updated copy number analysis and compare to update values
  it('Get updated copy number analysis and match to raw update data', (done) => {
    chai.request(server)
      .get(`/api/1.0/POG/POG684/report/TV83Z/genomic/copyNumberAnalyses/cnv/${ident}`)
      .auth(username, password)
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;

        // Should equal updated values
        res.body.cnvVariant.should.equal(update.cnvVariant);
        res.body.gene.should.equal(update.gene);
        res.body.ploidyCorrCpChange.should.equal(update.ploidyCorrCpChange);
        res.body.lohState.should.equal(update.lohState);
        res.body.cnvState.should.equal(update.cnvState);
        res.body.chromosomeBand.should.equal(update.chromosomeBand);
        res.body.start.should.equal(update.start);
        res.body.end.should.equal(update.end);
        res.body.size.should.equal(update.size);
        res.body.expressionRpkm.should.equal(update.expressionRpkm);
        res.body.foldChange.should.equal(update.foldChange);
        res.body.tcgaPerc.should.equal(update.tcgaPerc);

        done();
      });
  });

  // Delete newly created copy number analysis
  it('Delete newly created copy number analysis', (done) => {
    chai.request(server)
      .delete(`/api/1.0/POG/POG684/report/TV83Z/genomic/copyNumberAnalyses/cnv/${ident}`)
      .auth(username, password)
      .end((err, res) => {
        res.should.have.status(200);
        done();
      });
  });

  // Make sure updated copy number analysis is deleted
  it('Verify updated copy number analysis is deleted', (done) => {
    chai.request(server)
      .get(`/api/1.0/POG/POG684/report/TV83Z/genomic/copyNumberAnalyses/cnv/${ident}`)
      .auth(username, password)
      .end((err, res) => {
        res.should.have.status(404);
        done();
      });
  });
});
