const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize) => {
  const smallMutations = sequelize.define('smallMutations', {
    ...DEFAULT_COLUMNS,
    reportId: {
      name: 'reportId',
      field: 'report_id',
      type: Sq.INTEGER,
      references: {
        model: 'reports',
        key: 'id',
      },
    },
    geneId: {
      name: 'geneId',
      field: 'gene_id',
      type: Sq.INTEGER,
      references: {
        model: 'reports_genes',
        key: 'id',
      },
      allowNull: false,
    },
    transcript: {
      type: Sq.TEXT,
    },
    proteinChange: {
      name: 'proteinChange',
      field: 'protein_change',
      type: Sq.TEXT,
    },
    location: {
      type: Sq.TEXT,
    },
    refAlt: {
      name: 'refAlt',
      field: 'ref_alt',
      type: Sq.TEXT,
    },
    zygosity: {
      type: Sq.TEXT,
    },
    tumourReads: {
      name: 'tumourReads',
      field: 'tumour_reads',
      type: Sq.TEXT,
    },
    rnaReads: {
      name: 'rnaReads',
      field: 'rna_reads',
      type: Sq.TEXT,
    },
    hgvsProtein: {
      name: 'hgvsProtein',
      field: 'hgvs_protein',
      type: Sq.TEXT,
    },
    hgvsCds: {
      name: 'hgvsCds',
      field: 'hgvs_cds',
      type: Sq.TEXT,
    },
    hgvsGenomic: {
      name: 'hgvsGenomic',
      field: 'hgvs_genomic',
      type: Sq.TEXT,
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_small_mutations',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'geneId', 'deletedAt']},
        include: [
          {model: sequelize.models.genes.scope('minimal'), as: 'gene'},
        ],
      },
    },
  });

  // set instance methods
  smallMutations.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, reportId, geneId, deletedAt, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return smallMutations;
};
