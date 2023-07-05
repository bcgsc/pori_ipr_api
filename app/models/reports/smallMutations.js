const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
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
    chromosome: {
      type: Sq.TEXT,
    },
    startPosition: {
      name: 'startPosition',
      field: 'start_position',
      type: Sq.INTEGER,
    },
    endPosition: {
      name: 'endPosition',
      field: 'end_position',
      type: Sq.INTEGER,
    },
    refSeq: {
      name: 'refSeq',
      field: 'ref_seq',
      type: Sq.TEXT,
    },
    altSeq: {
      name: 'altSeq',
      field: 'alt_seq',
      type: Sq.TEXT,
    },
    zygosity: {
      type: Sq.TEXT,
    },
    tumourAltCount: {
      name: 'tumourAltCount',
      field: 'tumour_alt_count',
      type: Sq.INTEGER,
    },
    tumourRefCount: {
      name: 'tumourRefCount',
      field: 'tumour_ref_count',
      type: Sq.INTEGER,
    },
    tumourDepth: {
      name: 'tumourDepth',
      field: 'tumour_depth',
      type: Sq.INTEGER,
    },
    rnaAltCount: {
      name: 'rnaAltCount',
      field: 'rna_alt_count',
      type: Sq.INTEGER,
    },
    rnaRefCount: {
      name: 'rnaRefCount',
      field: 'rna_ref_count',
      type: Sq.INTEGER,
    },
    rnaDepth: {
      name: 'rnaDepth',
      field: 'rna_depth',
      type: Sq.INTEGER,
    },
    normalAltCount: {
      name: 'normalAltCount',
      field: 'normal_alt_count',
      type: Sq.INTEGER,
    },
    normalRefCount: {
      name: 'normalRefCount',
      field: 'normal_ref_count',
      type: Sq.INTEGER,
    },
    normalDepth: {
      name: 'normalDepth',
      field: 'normal_depth',
      type: Sq.INTEGER,
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
    ncbiBuild: {
      name: 'ncbiBuild',
      field: 'ncbi_build',
      type: Sq.TEXT,
    },
    germline: {
      type: Sq.BOOLEAN,
    },
    tumourAltCopies: {
      name: 'tumourAltCopies',
      field: 'tumour_alt_copies',
      type: Sq.INTEGER,
    },
    tumourRefCopies: {
      name: 'tumourRefCopies',
      field: 'tumour_ref_copies',
      type: Sq.INTEGER,
    },
    library: {
      type: Sq.TEXT,
    },
    comments: {
      type: Sq.TEXT,
    },
    displayName: {
      name: 'displayName',
      field: 'display_name',
      type: Sq.TEXT,
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_small_mutations',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'geneId', 'deletedAt', 'updatedBy']},
        include: [
          {model: sequelize.models.genes.scope('minimal'), as: 'gene'},
        ],
      },
    },
  });

  // set instance methods
  smallMutations.prototype.view = function (scope) {
    if (scope === 'public') {
      const {
        id, reportId, geneId, deletedAt, updatedBy, ...publicView
      } = this.dataValues;
      return publicView;
    }
    return this;
  };

  return smallMutations;
};
