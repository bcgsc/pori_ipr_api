const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const notification = sequelize.define(
    'notificationTrack',
    {
      ...DEFAULT_COLUMNS,
      notificationId: {
        name: 'notificationId',
        field: 'notification_id',
        unique: false,
        type: Sq.INTEGER,
        references: {
          model: 'notifications',
          key: 'id',
        },
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
    },
    {
      ...DEFAULT_OPTIONS,
      tableName: 'notifications_tracks',
      scopes: {
        public: {
          attributes: {
            exclude: ['id', 'deletedAt', 'updatedBy', 'notificationId'],
          },
          include: [
            {model: sequelize.models.notification.scope('public'), as: 'notifications'},
          ],
        },
        extended: {
          include: [
            {model: sequelize.models.notification, as: 'notifications'},
          ],
        },
      },
    },
  );

  // set instance methods
  notification.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, deletedAt, updatedBy, notificationId, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return notification;
};
