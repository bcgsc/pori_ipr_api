const { DEFAULT_COLUMNS, DEFAULT_OPTIONS } = require('../base');

module.exports = (sequelize, Sq) => {
  return sequelize.define(
    'notification',
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
      userGroupId: {
        type: Sq.INTEGER,
        name: 'userGroupId',
        field: 'user_group_id',
        unique: false,
        references: {
          model: 'user_groups',
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
      tableName: 'notifications',
    },
  );

  // set instance methods
  notification.prototype.view = function (scope) {
    if (scope === 'public') {
      const { id, deletedAt, updatedBy, ...publicView } = this.dataValues;
      return publicView;
    }
    return this;
  };
};
