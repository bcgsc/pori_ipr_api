const Sq = require('sequelize');

const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = sequelize => sequelize.define('mutationSignature', {
  ...DEFAULT_COLUMNS,
  pog_id: {
    type: Sq.INTEGER,
    references: {
      model: 'POGs',
      key: 'id',
    },
  },
  reportId: {
    name: 'reportId',
    field: 'report_id',
    type: Sq.INTEGER,
    references: {
      model: 'pog_analysis_reports',
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
  // Table Name
  tableName: 'pog_analysis_reports_somatic_mutations_mutation_signature',
  scopes: {
    public: {
      attributes: {exclude: ['id', 'deletedAt', 'reportId', 'pog_id']},
    },
  },
});
