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
describe('/GET DetailedGenomicAnalysis/Alterations', () => {
  it('Get detailed genomic alterations', (done) => {
    chai.request(server)
      .get('/api/1.0/POG/POG684/genomic/detailedGenomicAnalysis/alterations')
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('array');
        res.body.should.all.have.property('ident');
        res.body.should.all.have.property('dataVersion');
        res.body.should.all.have.property('alterationType');
        res.body.should.all.have.property('newEntry');
        res.body.should.all.have.property('approvedTherapy');
        res.body.should.all.have.property('gene');
        res.body.should.all.have.property('variant');
        res.body.should.all.have.property('kbVariant');
        res.body.should.all.have.property('disease');
        res.body.should.all.have.property('effect');
        res.body.should.all.have.property('association');
        res.body.should.all.have.property('therapeuticContext');
        res.body.should.all.have.property('status');
        res.body.should.all.have.property('reference');
        res.body.should.all.have.property('expression_tissue_fc');
        res.body.should.all.have.property('expression_cancer_percentile');
        res.body.should.all.have.property('copyNumber');
        res.body.should.all.have.property('sample');
        res.body.should.all.have.property('LOHRegion');
        res.body.should.all.have.property('zygosity');
        res.body.should.all.have.property('evidence');
        res.body.should.all.have.property('matched_cancer');
        res.body.should.all.have.property('pmid_ref');
        res.body.should.all.have.property('variant_type');
        res.body.should.all.have.property('kb_type');
        res.body.should.all.have.property('kb_entry_type');
        res.body.should.all.have.property('kb_event_key');
        res.body.should.all.have.property('kb_entry_key');
        res.body.should.all.have.property('kb_newEntry');
        res.body.should.all.have.property('createdAt');
        res.body.should.all.have.property('updatedAt');

        ident = res.body[0].ident;

        done();
      });
  });
});


// Get genomic alterations identified
describe('/GET Type DetailedGenomicAnalysis/Alterations', () => {
  it('Get specific type of detailed genomic alterations', (done) => {
    chai.request(server)
      .get('/api/1.0/POG/POG684/genomic/detailedGenomicAnalysis/alterations/prognostic')
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('array');
        res.body.should.all.have.property('ident');
        res.body.should.all.have.property('dataVersion');
        res.body.should.all.have.property('alterationType', 'prognostic');
        res.body.should.all.have.property('newEntry');
        res.body.should.all.have.property('approvedTherapy');
        res.body.should.all.have.property('gene');
        res.body.should.all.have.property('variant');
        res.body.should.all.have.property('kbVariant');
        res.body.should.all.have.property('disease');
        res.body.should.all.have.property('effect');
        res.body.should.all.have.property('association');
        res.body.should.all.have.property('therapeuticContext');
        res.body.should.all.have.property('status');
        res.body.should.all.have.property('reference');
        res.body.should.all.have.property('expression_tissue_fc');
        res.body.should.all.have.property('expression_cancer_percentile');
        res.body.should.all.have.property('copyNumber');
        res.body.should.all.have.property('sample');
        res.body.should.all.have.property('LOHRegion');
        res.body.should.all.have.property('zygosity');
        res.body.should.all.have.property('evidence');
        res.body.should.all.have.property('matched_cancer');
        res.body.should.all.have.property('pmid_ref');
        res.body.should.all.have.property('variant_type');
        res.body.should.all.have.property('kb_type');
        res.body.should.all.have.property('kb_entry_type');
        res.body.should.all.have.property('kb_event_key');
        res.body.should.all.have.property('kb_entry_key');
        res.body.should.all.have.property('kb_newEntry');
        res.body.should.all.have.property('createdAt');
        res.body.should.all.have.property('updatedAt');

        ident = res.body[0].ident;

        done();
      });
  });
});


// Get genomic alterations identified
describe('/GET Single DetailedGenomicAnalysis/Alterations', () => {
  it('Get copy number variants', (done) => {
    chai.request(server)
      .get('/api/1.0/POG/POG684/genomic/detailedGenomicAnalysis/alterations/'+ident)
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.have.property('ident');
        res.body.should.have.property('dataVersion');
        res.body.should.have.property('alterationType');
        res.body.should.have.property('newEntry');
        res.body.should.have.property('approvedTherapy');
        res.body.should.have.property('gene');
        res.body.should.have.property('variant');
        res.body.should.have.property('kbVariant');
        res.body.should.have.property('disease');
        res.body.should.have.property('effect');
        res.body.should.have.property('association');
        res.body.should.have.property('therapeuticContext');
        res.body.should.have.property('status');
        res.body.should.have.property('reference');
        res.body.should.have.property('expression_tissue_fc');
        res.body.should.have.property('expression_cancer_percentile');
        res.body.should.have.property('copyNumber');
        res.body.should.have.property('sample');
        res.body.should.have.property('LOHRegion');
        res.body.should.have.property('zygosity');
        res.body.should.have.property('evidence');
        res.body.should.have.property('matched_cancer');
        res.body.should.have.property('pmid_ref');
        res.body.should.have.property('variant_type');
        res.body.should.have.property('kb_type');
        res.body.should.have.property('kb_entry_type');
        res.body.should.have.property('kb_event_key');
        res.body.should.have.property('kb_entry_key');
        res.body.should.have.property('kb_newEntry');
        res.body.should.have.property('createdAt');
        res.body.should.have.property('updatedAt');

        done();
      });
  });
});

// Update variant counts details
describe('/PUT DetailedGenomicAnalysis/Alterations', () => {
  it('Update Detailed Genomic Analysis alteration', (done) => {

    let update = {
      "alterationType": "prognostic",
      "newEntry": false,
      "approvedTherapy": null,
      "gene": "ACTN4 -- updated",
      "variant": "copy gain",
      "kbVariant": "copy gain",
      "disease": "pancreatic cancer",
      "effect": "",
      "association": "unfavourable",
      "therapeuticContext": "response to chemoradiotherapy",
      "status": "na",
      "reference": "25602965#",
      "expression_tissue_fc": "Neutral",
      "expression_cancer_percentile": "Mid",
      "copyNumber": "Gain",
      "sample": "POG684-OCT-1",
      "LOHRegion": "No",
      "zygosity": "na",
      "evidence": "clinical-test",
      "matched_cancer": "False",
      "pmid_ref": "yes",
      "variant_type": "copy number variant",
      "kb_type": "copy number variant",
      "kb_entry_type": "prognostic",
      "kb_event_key": "copy number variant_ACTN4_copy gain",
      "kb_entry_key": "prognostic_unfavourable_response to chemoradiotherapy_(copy number variant_ACTN4_copy gain,True,na)_pancreatic cancer_clinical-test_pubmed_25602965",
      "kb_newEntry": null
    };

    chai.request(server)
      .put('/api/1.0/POG/POG684/genomic/detailedGenomicAnalysis/alterations/'+ident)
      .send(update)
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.have.property('ident');
        res.body.should.have.property('dataVersion');
        res.body.should.have.property('alterationType');
        res.body.should.have.property('newEntry');
        res.body.should.have.property('approvedTherapy');
        res.body.should.have.property('gene', 'ACTN4 -- updated');
        res.body.should.have.property('variant');
        res.body.should.have.property('kbVariant');
        res.body.should.have.property('disease');
        res.body.should.have.property('effect');
        res.body.should.have.property('association');
        res.body.should.have.property('therapeuticContext');
        res.body.should.have.property('status');
        res.body.should.have.property('reference');
        res.body.should.have.property('expression_tissue_fc');
        res.body.should.have.property('expression_cancer_percentile');
        res.body.should.have.property('copyNumber');
        res.body.should.have.property('sample');
        res.body.should.have.property('LOHRegion');
        res.body.should.have.property('zygosity');
        res.body.should.have.property('evidence');
        res.body.should.have.property('matched_cancer');
        res.body.should.have.property('pmid_ref');
        res.body.should.have.property('variant_type');
        res.body.should.have.property('kb_type');
        res.body.should.have.property('kb_entry_type');
        res.body.should.have.property('kb_event_key');
        res.body.should.have.property('kb_entry_key');
        res.body.should.have.property('kb_newEntry');
        res.body.should.have.property('createdAt');
        res.body.should.have.property('updatedAt');

        done();
      });
  });
});


// Get genomic alterations identified
describe('/GET DetailedGenomicAnalysis/Targeted Genes', () => {
  it('Get targeted gene analysis', (done) => {
    chai.request(server)
      .get('/api/1.0/POG/POG684/genomic/detailedGenomicAnalysis/targetedGenes')
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('array');
        res.body.should.all.have.property('ident');
        res.body.should.all.have.property('dataVersion');
        res.body.should.all.have.property('gene');
        res.body.should.all.have.property('variant');
        res.body.should.all.have.property('sample');
        res.body.should.all.have.property('createdAt');
        res.body.should.all.have.property('updatedAt');

        ident = res.body[0].ident;

        done();
      });
  });
});