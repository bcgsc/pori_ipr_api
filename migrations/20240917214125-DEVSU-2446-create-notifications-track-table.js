const TABLE = 'notifications_tracks';
const {DEFAULT_COLUMNS} = require('../app/models/base');

module.exports = {
  up: (queryInterface, Sq) => {
    // Create new notifications tables
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(TABLE, {
        ...DEFAULT_COLUMNS,
        notificationId: {
          name: 'notificationId',
          field: 'notification_id',
          type: Sq.INTEGER,
          references: {
            model: 'notifications',
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
          allowNull: false,
        },
        recipient: {
          name: 'recipient',
          field: 'recipient',
          type: Sq.STRING,
        },
        reason: {
          name: 'reason',
          field: 'reason',
          type: Sq.STRING,
        },
        outcome: {
          name: 'outcome',
          field: 'outcome',
          type: Sq.STRING,
        },
      }, {transaction});
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
