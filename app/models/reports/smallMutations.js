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
      field: 'protein_change',
      name: 'proteinChange',
      type: Sq.TEXT,
    },
    location: {
      type: Sq.TEXT,
    },
    refAlt: {
      field: 'ref_alt',
      name: 'refAlt',
      type: Sq.TEXT,
    },
    zygosity: {
      type: Sq.TEXT,
    },
    tumourReads: {
      field: 'tumour_reads',
      name: 'tumourReads',
      type: Sq.TEXT,
    },
    rnaReads: {
      field: 'rna_reads',
      name: 'rnaReads',
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
      middleware: {
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
