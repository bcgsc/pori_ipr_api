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
    reviewerSignedBy_id: {
      type: Sq.INTEGER,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    reviewerSignedAt: {
      type: Sq.DATE,
      allowNull: true,
    },
    authorSignedBy_id: {
      type: Sq.INTEGER,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    authorSignedAt: {
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
          exclude: ['id', 'reportId', 'deletedAt', 'authorSignedBy_id', 'reviewerSignedBy_id'],
        },
        include: [
          {model: sequelize.models.user.scope('public'), as: 'reviewerSignature'},
          {model: sequelize.models.user.scope('public'), as: 'authorSignature'},
        ],
      },
    },
  });
};
