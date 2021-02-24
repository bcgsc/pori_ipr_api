const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const pairwiseExpressionCorrelation = sequelize.define('pairwiseExpressionCorrelation', {
    ...DEFAULT_COLUMNS,
    reportId: {
      name: 'reportId',
      field: 'report_id',
      type: Sq.INTEGER,
      references: {
        model: 'reports',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      allowNull: false,
    },
    patientId: {
      name: 'patientId',
      field: 'patient_id',
      type: Sq.TEXT,
      allowNull: false,
    },
    library: {
      type: Sq.TEXT,
    },
    correlation: {
      type: Sq.FLOAT,
      allowNull: false,
    },
    tumourType: {
      name: 'tumourType',
      field: 'tumour_type',
      type: Sq.TEXT,
    },
    tissueType: {
      name: 'tissueType',
      field: 'tissue_type',
      type: Sq.TEXT,
    },
    tumourContent: {
      name: 'tumourContent',
      field: 'tumour_content',
      type: Sq.FLOAT,
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_pairwise_expression_correlation',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'deletedAt']},
      },
    },
  });

  // set instance methods
  pairwiseExpressionCorrelation.prototype.view = function (scope) {
    if (scope === 'public') {
      const {
        id, reportId, deletedAt, ...publicView
      } = this.dataValues;
      return publicView;
    }
    return this;
  };

  return pairwiseExpressionCorrelation;
};
