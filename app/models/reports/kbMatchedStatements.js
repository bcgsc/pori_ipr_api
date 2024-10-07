const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const KbMatchedStatements = sequelize.define('kbMatchedStatements', {
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
      type: Sq.ENUM(
        'therapeutic',
        'prognostic',
        'diagnostic',
        'biological',
        'unknown',
        'novel',
        'pharmacogenomic',
        'cancer predisposition',
      ),
      allowNull: false,
    },
    approvedTherapy: {
      name: 'approvedTherapy',
      field: 'approved_therapy',
      type: Sq.BOOLEAN,
      defaultValue: false,
      allowNull: false,
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
    sample: {
      type: Sq.TEXT,
    },
    evidenceLevel: {
      name: 'evidenceLevel',
      field: 'evidence_level',
      type: Sq.TEXT,
    },
    iprEvidenceLevel: {
      name: 'iprEvidenceLevel',
      field: 'ipr_evidence_level',
      type: Sq.TEXT,
      defaultValue: null,
    },
    matchedCancer: {
      name: 'matchedCancer',
      field: 'matched_cancer',
      type: Sq.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    pmidRef: {
      name: 'pmidRef',
      field: 'pmid_ref',
      type: Sq.TEXT,
    },
    kbStatementId: {
      name: 'kbStatementId',
      field: 'kb_statement_id',
      type: Sq.TEXT,
    },
    kbData: {
      name: 'kbData',
      field: 'kb_data',
      type: Sq.JSONB,
      jsonSchema: {
        schema: {
          type: 'object',
          example: {inferred: true},
        },
      },
    },
    externalSource: {
      name: 'externalSource',
      field: 'external_source',
      type: Sq.TEXT,
    },
    externalStatementId: {
      name: 'externalStatementId',
      field: 'external_statement_id',
      type: Sq.TEXT,
    },
    reviewStatus: {
      name: 'reviewStatus',
      field: 'review_status',
      type: Sq.TEXT,
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_kb_matched_statements',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'deletedAt', 'updatedBy']},
      },
    },
    modelName: 'kbMatchedStatements',
    sequelize,
  });

  return KbMatchedStatements;
};
