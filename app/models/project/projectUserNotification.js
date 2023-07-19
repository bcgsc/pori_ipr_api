const {DEFAULT_MAPPING_COLUMNS, DEFAULT_MAPPING_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  return sequelize.define(
    'userProject',
    {
      ...DEFAULT_MAPPING_COLUMNS,
      user_id: {
        type: Sq.INTEGER,
        unique: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      event_type: {
        type: Sq.STRING,
        unique: false,
        allowNull: false,
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
      tableName: 'project_user_notifications',
    },
  );
};
