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
    kbVariant: {
      name: 'kbVariant',
      field: 'kb_variant',
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
