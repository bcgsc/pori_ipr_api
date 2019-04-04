const Sq = require('sequelize');

module.exports = sequelize => sequelize.define('genomicEventsTherapeutic', {
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
  dataVersion: {
    type: Sq.INTEGER,
    defaultValue: 0,
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
  reportType: {
    type: Sq.ENUM('genomic', 'probe'),
    defaultValue: 'genomic',
  },
  genomicEvent: {
    type: Sq.TEXT,
    allowNull: false,
  },
  approvedThisCancerType: {
    type: Sq.TEXT,
    allowNull: true,
  },
  approvedOtherCancerType: {
    type: Sq.TEXT,
    allowNull: true,
  },
  emergingPreclinicalEvidence: {
    type: Sq.TEXT,
    allowNull: true,
  },
  comments: {
    type: Sq.TEXT,
    allowNull: true,
  },
}, {
  // Table Name
  tableName: 'pog_analysis_reports_summary_genomic_events_therapeutic',
  // Automatically create createdAt, updatedAt, deletedAt
  timestamps: true,
  // Use soft-deletes!
  paranoid: true,
  scopes: {
    public: {
      attributes: {
        exclude: ['id', 'pog_id', 'pog_report_id', 'deletedAt'],
      },
    },
  },
});
