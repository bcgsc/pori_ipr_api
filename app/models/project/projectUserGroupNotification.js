const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  return sequelize.define(
    'projectUserGroupNotification',
    {
      ...DEFAULT_COLUMNS,
      userGroupId: {
        type: Sq.INTEGER,
        name: 'userGroup',
        field: 'user_group',
        unique: false,
        references: {
          model: 'user_groups',
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
      tableName: 'project_user_group_notifications',
    },
  );
};
