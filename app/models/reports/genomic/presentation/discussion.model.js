const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = (sequelize) => {
  const presentationDiscussion = sequelize.define('presentationDiscussion', {
    ...DEFAULT_COLUMNS,
    reportId: {
      name: 'reportId',
      field: 'report_id',
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
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'reports_presentation_discussion',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'reportId', 'user_id', 'deletedAt'],
        },
        include: [
          {model: sequelize.models.user.scope('public'), as: 'user'},
        ],
      },
    },
  });

  // set instance methods
  presentationDiscussion.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, reportId, user_id, deletedAt, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return presentationDiscussion;
};
