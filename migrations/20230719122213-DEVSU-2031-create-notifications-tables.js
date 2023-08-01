const USERNOTIFICATIONS = 'notifications';
const { DEFAULT_COLUMNS } = require('../app/models/base');

module.exports = {
  up: (queryInterface, Sq) => {
    // Create new notifications tables
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(USERNOTIFICATIONS, {
        ...DEFAULT_COLUMNS,
        projectId: {
          name: 'projectId',
          field: 'project_id',
          type: Sq.INTEGER,
          references: {
            model: 'projects',
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
          allowNull: false,
        },
        userId: {
          name: 'userId',
          field: 'user_id',
          type: Sq.INTEGER,
          references: {
            model: 'users',
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
          allowNull: true,
        },
        userGroupId: {
          name: 'userGroupId',
          field: 'user_group_id',
          type: Sq.INTEGER,
          references: {
            model: 'user_groups',
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
          allowNull: true,
        },
        templateId: {
          name: 'templateId',
          field: 'template_id',
          type: Sq.INTEGER,
          references: {
            model: 'templates',
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
          allowNull: false,
        },
        eventType: {
          name: 'eventType',
          field: 'event_type',
          type: Sq.STRING,
          allowNull: false,
        },
      }, { transaction });
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
