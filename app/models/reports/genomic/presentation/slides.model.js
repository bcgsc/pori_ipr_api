const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = (sequelize) => {
  const presentationSlides = sequelize.define('presentation_slides', {
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
    name: {
      type: Sq.TEXT,
      allowNull: false,
    },
    object: {
      type: Sq.TEXT,
      allowNull: true,
    },
    object_type: {
      type: Sq.TEXT,
      allowNull: false,
    },
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'reports_presentation_slides',
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
  presentationSlides.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, reportId, user_id, deletedAt, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return presentationSlides;
};
