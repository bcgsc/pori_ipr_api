const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../base');

module.exports = (sequelize) => {
  return sequelize.define('probe_signature', {
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
    tableName: 'reports_probe_signature',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'deletedAt', 'readySignedBy_id', 'reviewerSignedBy_id']},
        include: [
          {model: sequelize.models.user.scope('public'), as: 'reviewerSignature'},
          {model: sequelize.models.user.scope('public'), as: 'readySignature'},
        ],
      },
    },
  });
};
