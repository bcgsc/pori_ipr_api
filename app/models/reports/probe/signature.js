const Sq = require('sequelize');

module.exports = sequelize => sequelize.define('probe_signature', {
  id: {
    type: Sq.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  ident: {
    type: Sq.UUID,
    unique: false,
    defaultValue: Sq.UUIDV4,
  },
  pog_id: {
    type: Sq.INTEGER,
    references: {
      model: 'POGs',
      key: 'id',
    },
  },
  pog_report_id: {
    type: Sq.INTEGER,
    references: {
      model: 'pog_analysis_reports',
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
  // Table Name
  tableName: 'pog_analysis_reports_probe_signature',
  // Automatically create createdAt, updatedAt, deletedAt
  timestamps: true,
  paranoid: true,
  scopes: {
    public: {
      attributes: {exclude: ['id', 'pog_report_id', 'pog_id', 'deletedAt', 'readySignedBy_id', 'reviewerSignedBy_id']},
      include: [
        {model: sequelize.models.user.scope('public'), as: 'reviewerSignature'},
        {model: sequelize.models.user.scope('public'), as: 'readySignature'},
      ],
    },
  },
});
