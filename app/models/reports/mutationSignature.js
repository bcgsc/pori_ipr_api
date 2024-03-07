const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const mutationSignature = sequelize.define('mutationSignature', {
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
    signature: {
      type: Sq.TEXT,
    },
    pearson: {
      type: Sq.FLOAT,
    },
    nnls: {
      type: Sq.FLOAT,
    },
    associations: {
      type: Sq.TEXT,
    },
    features: {
      type: Sq.TEXT,
    },
    numCancerTypes: {
      name: 'numCancerTypes',
      field: 'num_cancer_types',
      type: Sq.INTEGER,
    },
    cancerTypes: {
      name: 'cancerTypes',
      field: 'cancer_types',
      type: Sq.TEXT,
    },
    kbCategory: {
      name: 'kbCategory',
      field: 'kb_category',
      type: Sq.TEXT,
    },
    selected: {
      type: Sq.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_mutation_signature',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'deletedAt', 'updatedBy']},
      },
    },
  });

  // set instance methods
  mutationSignature.prototype.view = function (scope) {
    if (scope === 'public') {
      const {
        id, reportId, deletedAt, updatedBy, ...publicView
      } = this.dataValues;
      return publicView;
    }
    return this;
  };

  return mutationSignature;
};
