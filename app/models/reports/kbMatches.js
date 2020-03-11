const Sq = require('sequelize');

const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize) => {
  return sequelize.define('kbMatches', {
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
    category: {
      type: Sq.ENUM('therapeutic', 'prognostic', 'diagnostic', 'biological', 'unknown', 'novel'),
      allowNull: false,
    },
    approvedTherapy: {
      field: 'approved_therapy',
      name: 'approvedTherapy',
      type: Sq.TEXT,
      defaultValue: null,
    },
    gene: {
      type: Sq.TEXT,
    },
    variant: {
      type: Sq.TEXT,
    },
    kbVariant: {
      field: 'kb_variant',
      name: 'kbVariant',
      type: Sq.TEXT,
    },
    disease: {
      type: Sq.TEXT,
    },
    relevance: {
      type: Sq.TEXT,
    },
    context: {
      type: Sq.TEXT,
    },
    status: {
      type: Sq.TEXT,
    },
    reference: {
      type: Sq.TEXT,
    },
    expressionTissueFc: {
      field: 'expression_tissue_fc',
      name: 'expressionTissueFc',
      type: Sq.TEXT,
    },
    expressionCancerPercentile: {
      field: 'expression_cancer_percentile',
      name: 'expressionCancerPercentile',
      type: Sq.TEXT,
    },
    copyNumber: {
      field: 'copy_number',
      name: 'copyNumber',
      type: Sq.TEXT,
    },
    sample: {
      type: Sq.TEXT,
    },
    lohRegion: {
      type: Sq.TEXT,
      field: 'loh_region',
      name: 'lohRegion',
    },
    zygosity: {
      type: Sq.TEXT,
    },
    evidenceLevel: {
      field: 'evidence_level',
      name: 'evidenceLevel',
      type: Sq.TEXT,
    },
    matchedCancer: {
      field: 'matched_cancer',
      name: 'matchedCancer',
      type: Sq.TEXT,
    },
    pmidRef: {
      field: 'pmid_ref',
      name: 'pmidRef',
      type: Sq.TEXT,
    },
    variantType: {
      field: 'variant_type',
      name: 'variantType',
      type: Sq.TEXT,
    },
    kbVariantId: {
      name: 'kbVariantId',
      field: 'kb_variant_id',
      type: Sq.TEXT,
    },
    kbStatementId: {
      field: 'kb_statement_id',
      name: 'kbStatementId',
      type: Sq.TEXT,
    },
    kbData: {
      field: 'kb_data',
      name: 'kbData',
      type: Sq.JSONB,
    },
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'reports_kb_matches',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'deletedAt', 'reportId']},
      },
    },
  });
};
