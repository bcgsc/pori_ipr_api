const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize) => {
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
      type: Sq.INTEGER,
    },
    cancerTypes: {
      type: Sq.TEXT,
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_somatic_mutations_mutation_signature',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'deletedAt']},
      },
    },
  });

  // set instance methods
  mutationSignature.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, reportId, deletedAt, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return mutationSignature;
};
