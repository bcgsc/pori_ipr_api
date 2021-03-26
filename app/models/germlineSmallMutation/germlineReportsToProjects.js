const {DEFAULT_MAPPING_COLUMNS, DEFAULT_MAPPING_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  return sequelize.define('germlineReportsToProjects', {
    ...DEFAULT_MAPPING_COLUMNS,
    germlineReportId: {
      name: 'germlineReportId',
      field: 'germline_report_id',
      type: Sq.INTEGER,
      unique: false,
      allowNull: false,
      references: {
        model: 'germline_small_mutations',
        key: 'id',
      },
    },
    projectId: {
      name: 'projectId',
      field: 'project_id',
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
    tableName: 'germline_reports_to_projects',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'deletedAt'],
        },
      },
    },
  });
};
