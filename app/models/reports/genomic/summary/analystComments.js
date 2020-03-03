const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = (sequelize) => {
  return sequelize.define('analystComments', {
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
    comments: {
      type: Sq.TEXT,
      allowNull: true,
    },
    reviewerId: {
      name: 'reviewerId',
      field: 'reviewer_id',
      type: Sq.INTEGER,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    reviewerSignedAt: {
      name: 'reviewerSignedAt',
      field: 'reviewer_signed_at',
      type: Sq.DATE,
      allowNull: true,
    },
    authorId: {
      field: 'author_id',
      name: 'authorId',
      type: Sq.INTEGER,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    authorSignedAt: {
      name: 'authorSignedAt',
      field: 'author_signed_at',
      type: Sq.DATE,
      allowNull: true,
    },
  },
  {
    ...DEFAULT_OPTIONS,
    tableName: 'reports_summary_analyst_comments',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'reportId', 'deletedAt', 'authorId', 'reviewerId'],
        },
        include: [
          {model: sequelize.models.user.scope('public'), as: 'reviewerSignature'},
          {model: sequelize.models.user.scope('public'), as: 'authorSignature'},
        ],
      },
    },
  });
};
