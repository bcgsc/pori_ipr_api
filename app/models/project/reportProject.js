const {DEFAULT_MAPPING_COLUMNS, DEFAULT_MAPPING_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  return sequelize.define(
    'reportProject',
    {
      ...DEFAULT_MAPPING_COLUMNS,
      reportId: {
        name: 'reportId',
        field: 'report_id',
        type: Sq.INTEGER,
        unique: false,
        allowNull: false,
        references: {
          model: 'reports',
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
      additionalProject: {
        type: Sq.BOOLEAN,
        unique: false,
        defaultValue: false,
        allowNull: false,
        field: 'additional_project',
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
    },
  );
};
