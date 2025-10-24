const {KB_PIVOT_COLUMN, KB_PIVOT_MAPPING} = require('../../../../constants');
const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../../../base');

module.exports = (sequelize, Sq) => {
  const genomicAlterations = sequelize.define('genomicAlterationsIdentified', {
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
    geneVariant: {
      type: Sq.TEXT,
      allowNull: false,
    },
    variantType: {
      name: KB_PIVOT_COLUMN,
      field: 'variant_type',
      type: Sq.ENUM(...Object.keys(KB_PIVOT_MAPPING)),
    },
    variantId: {
    // the 'FK' top the individual variant tables, cannot enforce constraints b/c it is polymorphic
      name: 'variantId',
      field: 'variant_id',
      type: Sq.INTEGER,
    },
    germline: {
      type: Sq.BOOLEAN,
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_summary_genomic_alterations_identified',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'reportId', 'deletedAt', 'updatedBy'],
        },
      },
    },
    hooks: {
      ...DEFAULT_REPORT_OPTIONS.hooks,
      afterFind: (findResult) => {
        if (findResult) {
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
        }
      },
    },
  });

  // set instance methods
  genomicAlterations.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, reportId, variantId, deletedAt, updatedBy, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  genomicAlterations.prototype.getVariant = function (options) {
    const targetModel = this.experimentalVariantType;

    if (!targetModel) {
      return Promise.resolve(null);
    }

    const mixinMethodName = `get${targetModel[0].toUpperCase()}${targetModel.slice(1)}`;
    return this[mixinMethodName](options);
  };

  return genomicAlterations;
};
