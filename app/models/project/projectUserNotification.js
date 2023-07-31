const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  return sequelize.define(
    'projectUserNotification',
    {
      ...DEFAULT_COLUMNS,
      userId: {
        type: Sq.INTEGER,
        name: 'userId',
        field: 'user_id',
        unique: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      eventType: {
        name: 'eventType',
        field: 'event_type',
        type: Sq.STRING,
        unique: false,
        allowNull: false,
      },
      projectId: {
        type: Sq.INTEGER,
        name: 'projectId',
        field: 'project_id',
        unique: false,
        allowNull: false,
        references: {
          model: 'projects',
          key: 'id',
        },
      },
      templateId: {
        type: Sq.INTEGER,
        name: 'templateId',
        field: 'template_id',
        unique: false,
        references: {
          model: 'templates',
          key: 'id',
        },
      },
    },
    {
      ...DEFAULT_OPTIONS,
      tableName: 'project_user_notifications',
    },
  );
};
