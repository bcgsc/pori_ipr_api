const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const structuralVariants = sequelize.define('structuralVariants', {
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
    mavis_product_id: {
      type: Sq.TEXT,
    },
    gene1Id: {
      name: 'gene1Id',
      field: 'gene1_id',
      type: Sq.INTEGER,
      references: {
        model: 'reports_genes',
        key: 'id',
      },
    },
    gene2Id: {
      name: 'gene2Id',
      field: 'gene2_id',
      type: Sq.INTEGER,
      references: {
        model: 'reports_genes',
        key: 'id',
      },
    },
    exon1: {
      type: Sq.TEXT,
    },
    exon2: {
      type: Sq.TEXT,
    },
    breakpoint: {
      type: Sq.TEXT,
    },
    eventType: {
      type: Sq.TEXT,
    },
    detectedIn: {
      type: Sq.TEXT,
    },
    conventionalName: {
      type: Sq.TEXT,
    },
    svg: {
      type: Sq.TEXT,
      defaultValue: null,
      jsonSchema: {
        description: 'SVG image of this fusion variant',
        schema: {format: 'svg', type: 'string'},
      },
    },
    svgTitle: {
      type: Sq.TEXT,
      defaultValue: null,
    },
    name: {
      type: Sq.TEXT,
      defaultValue: null,
    },
    frame: {
      type: Sq.TEXT,
      defaultValue: null,
    },
    ctermGene: {
      type: Sq.TEXT,
      defaultValue: null,
    },
    ntermGene: {
      type: Sq.TEXT,
      defaultValue: null,
    },
    ctermTranscript: {
      type: Sq.TEXT,
      defaultValue: null,
    },
    ntermTranscript: {
      type: Sq.TEXT,
      defaultValue: null,
    },
    omicSupport: {
      name: 'omicSupport',
      field: 'omic_support',
      type: Sq.BOOLEAN,
      defaultValue: false,
    },
    highQuality: {
      name: 'highQuality',
      field: 'high_quality',
      type: Sq.BOOLEAN,
      defaultValue: null,
    },
    germline: {
      type: Sq.BOOLEAN,
    },
    library: {
      type: Sq.TEXT,
    },
    tumourAltCount: {
      name: 'tumourAltCount',
      field: 'tumour_alt_count',
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
    rnaDepth: {
      name: 'rnaDepth',
      field: 'rna_depth',
      type: Sq.INTEGER,
    },
    comments: {
      type: Sq.TEXT,
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_structural_variants',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'gene1Id', 'gene2Id', 'deletedAt', 'updatedBy']},
        include: [
          {
            model: sequelize.models.genes.scope('minimal'),
            foreignKey: 'gene1Id',
            as: 'gene1',
          },
          {
            model: sequelize.models.genes.scope('minimal'),
            foreignKey: 'gene2Id',
            as: 'gene2',
          },
        ],
      },
    },
  });

  // set instance methods
  structuralVariants.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, reportId, gene1Id, gene2Id, deletedAt, updatedBy, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return structuralVariants;
};
