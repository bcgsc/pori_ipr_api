const Sq = require('sequelize');
const {DEFAULT_MAPPING_COLUMNS, DEFAULT_MAPPING_OPTIONS} = require('../base');

module.exports = (sequelize) => {
  return sequelize.define('report_project', {
    ...DEFAULT_MAPPING_COLUMNS,
    report_id: {
      type: Sq.INTEGER,
      unique: false,
      allowNull: false,
      references: {
        model: 'pog_analysis_reports',
        key: 'id',
      },
    },
    project_id: {
      type: Sq.INTEGER,
      unique: false,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id',
      },
    },
  },
  {
    ...DEFAULT_MAPPING_OPTIONS,
    tableName: 'report_projects',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'deletedAt'],
        },
      },
    },
  });
};
