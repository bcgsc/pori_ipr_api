const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  return sequelize.define(
    'userProject',
    {
      ...DEFAULT_COLUMNS,
      user_group_id: {
        type: Sq.INTEGER,
        unique: false,
        references: {
          model: 'user_groups',
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
      template_id: {
        type: Sq.INTEGER,
        unique: false,
        references: {
          model: 'templates',
          key: 'id',
        },
      },
    },
    {
      ...DEFAULT_OPTIONS,
      tableName: 'project_user_group_notifications',
    },
  );
};
