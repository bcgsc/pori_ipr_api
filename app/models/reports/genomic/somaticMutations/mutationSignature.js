const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = (sequelize) => {
  return sequelize.define('mutationSignature', {
    ...DEFAULT_COLUMNS,
    report_id: {
      type: Sq.INTEGER,
      references: {
        model: 'reports',
        key: 'id',
      },
    },
    signature: {
      type: Sq.INTEGER,
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
    ...DEFAULT_OPTIONS,
    tableName: 'reports_somatic_mutations_mutation_signature',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'report_id', 'deletedAt']},
      },
    },
  });
};
