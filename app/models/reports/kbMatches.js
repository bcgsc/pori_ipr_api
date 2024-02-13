const {KB_PIVOT_COLUMN, KB_PIVOT_MAPPING} = require('../../constants');
const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const KbMatches = sequelize.define('kbMatches', {
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
    kbVariant: {
      name: 'kbVariant',
      field: 'kb_variant',
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
    variantType: {
      name: KB_PIVOT_COLUMN,
      field: 'variant_type',
      type: Sq.ENUM(...Object.keys(KB_PIVOT_MAPPING)),
      allowNull: false,
    },
    variantId: {
      // the 'FK' top the individual variant tables, cannot enforce constraints b/c it is polymorphic
      name: 'variantId',
      field: 'variant_id',
      type: Sq.INTEGER,
      allowNull: false,
    },
    kbVariantId: {
      name: 'kbVariantId',
      field: 'kb_variant_id',
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
    tableName: 'reports_kb_matches',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'variantId', 'deletedAt', 'updatedBy']},
        include: Object.values(KB_PIVOT_MAPPING).map((modelName) => {
          return {model: sequelize.models[modelName].scope('public'), as: modelName};
        }),
      },
      extended: {
        attributes: {exclude: ['id', 'reportId', 'variantId', 'deletedAt', 'updatedBy']},
        include: Object.values(KB_PIVOT_MAPPING).map((modelName) => {
          return {model: sequelize.models[modelName].scope('extended'), as: modelName};
        }),
      },
    },
    hooks: {
      ...DEFAULT_REPORT_OPTIONS.hooks,
      afterFind: (findResult) => {
        if (!Array.isArray(findResult)) {
          findResult = [findResult];
        }
        for (const instance of findResult) {
          const {[KB_PIVOT_COLUMN]: currentPivotValue} = instance;

          for (const pivotType of Object.keys(KB_PIVOT_MAPPING)) {
            const modelName = KB_PIVOT_MAPPING[pivotType];

            if (instance[modelName] !== undefined) {
              if (pivotType === currentPivotValue) {
                instance.variant = instance[modelName];
                instance.dataValues.variant = instance[modelName].dataValues;
              }
              // To prevent mistakes:
              delete instance[modelName];
              delete instance.dataValues[modelName];
            }
          }
        }
      },
    },
    modelName: 'kbMatches',
    sequelize,
  });

  // set instance methods
  KbMatches.prototype.view = function (scope) {
    if (scope === 'public') {
      const {
        id, reportId, variantId, deletedAt, updatedBy, ...publicView
      } = this.dataValues;
      return publicView;
    }
    return this;
  };

  KbMatches.prototype.getVariant = function (options) {
    const targetModel = this.experimentalVariantType;

    if (!targetModel) {
      return Promise.resolve(null);
    }

    const mixinMethodName = `get${targetModel[0].toUpperCase()}${targetModel.slice(1)}`;
    return this[mixinMethodName](options);
  };

  return KbMatches;
};
