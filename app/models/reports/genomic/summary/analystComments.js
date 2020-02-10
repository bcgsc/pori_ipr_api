const Sq = require('sequelize');

const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = sequelize => sequelize.define('analystComments', {
  ...DEFAULT_COLUMNS,
  pog_id: {
    type: Sq.INTEGER,
    references: {
      model: 'POGs',
      key: 'id',
    },
  },
  reportId: {
    field: 'report_id',
    type: Sq.INTEGER,
    references: {
      model: 'pog_analysis_reports',
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
  // Table Name
  tableName: 'pog_analysis_reports_summary_analyst_comments',
  scopes: {
    public: {
      attributes: {
        exclude: ['id', 'pog_id', 'reportId', 'deletedAt', 'authorSignedBy_id', 'reviewerSignedBy_id'],
      },
      include: [
        {model: sequelize.models.user.scope('public'), as: 'reviewerSignature'},
        {model: sequelize.models.user.scope('public'), as: 'authorSignature'},
      ],
    },
  },
});
