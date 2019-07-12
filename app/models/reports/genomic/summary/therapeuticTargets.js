const Sq = require('sequelize');

const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = sequelize => sequelize.define('therapeuticTarget', {
  ...DEFAULT_COLUMNS,
  pog_id: {
    type: Sq.INTEGER,
    references: {
      model: 'POGs',
      key: 'id',
    },
  },
  pog_report_id: {
    type: Sq.INTEGER,
    references: {
      model: 'pog_analysis_reports',
      key: 'id',
    },
  },
  type: {
    type: Sq.ENUM('therapeutic', 'chemoresistance'),
    allowNull: false,
  },
  rank: {
    type: Sq.INTEGER,
    defaultValue: 0,
  },
  target: {
    type: Sq.JSONB,
    allowNull: true,
  },
  targetContext: {
    type: Sq.TEXT,
    allowNull: true,
  },
  resistance: {
    type: Sq.TEXT,
    allowNull: true,
  },
  biomarker: {
    type: Sq.JSONB,
    allowNull: true,
    defaultValue: [],
  },
  notes: {
    type: Sq.TEXT,
  },
},
{
  ...DEFAULT_OPTIONS,
  tableName: 'pog_analysis_reports_therapeutic_targets',
  scopes: {
    public: {
      attributes: {exclude: ['id', 'deletedAt', 'pog_report_id', 'pog_id']},
    },
  },
});
