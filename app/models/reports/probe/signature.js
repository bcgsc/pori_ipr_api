const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../base');

module.exports = sequelize => sequelize.define('probe_signature', {
  ...DEFAULT_COLUMNS,
  pog_id: {
    type: Sq.INTEGER,
    references: {
      model: 'POGs',
      key: 'id',
    },
  },
  report_id: {
    type: Sq.INTEGER,
    references: {
      model: 'pog_analysis_reports',
      key: 'id',
    },
  },
  reviewerId: {
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
  readySignedBy_id: {
    type: Sq.INTEGER,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  readySignedAt: {
    type: Sq.DATE,
    allowNull: true,
  },
},
{
  ...DEFAULT_OPTIONS,
  // Table Name
  tableName: 'pog_analysis_reports_probe_signature',
  scopes: {
    public: {
      attributes: {exclude: ['id', 'report_id', 'pog_id', 'deletedAt', 'readySignedBy_id', 'reviewerId']},
      include: [
        {model: sequelize.models.user.scope('public'), as: 'reviewerSignature'},
        {model: sequelize.models.user.scope('public'), as: 'readySignature'},
      ],
    },
  },
});
