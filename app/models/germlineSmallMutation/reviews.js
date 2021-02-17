const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize) => {
  const germlineReview = sequelize.define('germlineSmallMutationReview', {
    ...DEFAULT_COLUMNS,
    germlineReportId: {
      name: 'germlineReportId',
      field: 'germline_report_id',
      type: Sq.INTEGER,
      allowNull: false,
      references: {
        model: 'germline_small_mutations',
        key: 'id',
      },
    },
    reviewerId: {
      name: 'reviewerId',
      field: 'reviewer_id',
      type: Sq.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    type: {
      type: Sq.TEXT,
      allowNull: false,
    },
    comment: {
      type: Sq.TEXT,
      allowNull: true,
    },
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'germline_small_mutations_review',
    scopes: {
      public: {
        order: [['createdAt', 'ASC']],
        attributes: {
          exclude: ['id', 'germlineReportId', 'reviewerId', 'deletedAt'],
        },
        include: [
          {model: sequelize.models.user.scope('public'), as: 'reviewer'},
        ],
      },
    },
  });

  // set instance methods
  germlineReview.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, germlineReportId, reviewerId, deletedAt, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return germlineReview;
};
