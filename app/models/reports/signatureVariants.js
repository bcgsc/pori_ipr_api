const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const signatureVariants = sequelize.define('signatureVariants', {
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
    signatureName: {
      name: 'signatureName',
      field: 'signature_name',
      type: Sq.TEXT,
    },
    variantTypeName: {
      name: 'variantTypeName',
      field: 'variant_type_name',
      type: Sq.TEXT,
    },
    displayName: {
      name: 'displayName',
      field: 'display_name',
      type: Sq.TEXT,
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_signature_variants',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'reportId', 'deletedAt', 'updatedBy'],
        },
      },
      extended: {
        attributes: {
          exclude: ['id', 'reportId', 'deletedAt', 'updatedBy'],
        },
      },
    },
  });

  // set instance methods
  signatureVariants.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, reportId, deletedAt, updatedBy, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return signatureVariants;
};
