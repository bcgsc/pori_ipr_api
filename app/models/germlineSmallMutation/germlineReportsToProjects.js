const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize) => {
  return sequelize.define('germlineReportsToProjects', {
    ...DEFAULT_COLUMNS,
    germlineReportId: {
      field: 'germline_report_id',
      name: 'germlineReportId',
      type: Sq.INTEGER,
      unique: false,
      allowNull: false,
      references: {
        model: 'germline_small_mutation',
        key: 'id',
      },
    },
    projectId: {
      field: 'project_id',
      name: 'projectId',
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
    ...DEFAULT_OPTIONS,
    tableName: 'germline_reports_to_projects',
    scopes: {
      public: {
        attributes: {
          exclude: ['deletedAt', 'id'],
        },
      },
    },
  });
};
