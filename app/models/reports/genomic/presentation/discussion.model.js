const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = (sequelize) => {
  return sequelize.define('presentation_discussion', {
    ...DEFAULT_COLUMNS,
    report_id: {
      type: Sq.INTEGER,
      references: {
        model: 'reports',
        key: 'id',
      },
    },
    user_id: {
      type: Sq.INTEGER,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    body: {
      type: Sq.TEXT,
      allowNull: true,
    },
  },
  {
    ...DEFAULT_OPTIONS,
    tableName: 'reports_presentation_discussion',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'report_id', 'deletedAt'],
        },
        include: [
          {model: sequelize.models.user.scope('public'), as: 'user'},
        ],
      },
    },
  });
};
