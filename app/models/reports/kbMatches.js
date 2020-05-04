const Sq = require('sequelize');

const {KB_PIVOT_COLUMN, KB_PIVOT_MAPPING} = require('../../constants');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

class KbMatches extends Sq.Model {
  getVariant(options) {
    const targetModel = this.experimentalVariantType;
    if (!targetModel) return Promise.resolve(null);
    const mixinMethodName = `get${targetModel[0].toUpperCase()}${targetModel.slice(1)}`;
    return this[mixinMethodName](options);
  }
}

module.exports = (sequelize) => {
  return KbMatches.init({
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
      type: Sq.BOOLEAN,
      defaultValue: false,
      allowNull: false,
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
    sample: {
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
      type: Sq.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    pmidRef: {
      field: 'pmid_ref',
      name: 'pmidRef',
      type: Sq.TEXT,
    },
    variantType: {
      field: 'variant_type',
      name: KB_PIVOT_COLUMN,
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
        attributes: {exclude: ['id', 'deletedAt', 'reportId', 'variantId']},
        include: Object.values(KB_PIVOT_MAPPING).map((modelName) => {
          return {model: sequelize.models[modelName].scope('public'), as: modelName};
        }),
      },
      extended: {
        attributes: {exclude: ['id', 'deletedAt', 'reportId', 'variantId']},
        include: Object.values(KB_PIVOT_MAPPING).map((modelName) => {
          return {model: sequelize.models[modelName].scope('extended'), as: modelName};
        }),
      },
    },
    hooks: {
      ...DEFAULT_OPTIONS.hooks,
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
};
