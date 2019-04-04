const Sq = require('sequelize');

module.exports = sequelize => sequelize.define('kb_event', {
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
  createdBy_id: {
    type: Sq.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  reviewedBy_id: {
    type: Sq.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  key: {
    type: Sq.STRING,
    allowNull: false,
  },
  type: {
    type: Sq.ENUM('MUT', 'CNV', 'SV', 'FANN', 'ELV-RNA', 'ELV-PROT'),
    allowNull: false,
  },
  name: {
    type: Sq.STRING,
    allowNull: true,
  },
  display_coord: {
    type: Sq.STRING,
    allowNull: true,
  },
  notation: {
    type: Sq.STRING,
    allowNull: true,
  },
  related_events: {
    type: Sq.TEXT,
    allowNull: true,
  },
  subtype: {
    type: Sq.TEXT,
    allowNull: true,
  },
  description: {
    type: Sq.TEXT,
    allowNull: true,
  },
  status: {
    type: Sq.STRING,
    allowNull: false,
  },
  in_version: {
    type: Sq.STRING,
    allowNull: true,
  },
  comments: {
    type: Sq.TEXT,
    allowNull: true,
  },
  approvedAt: {
    type: Sq.DATE,
  },
}, {
  // Automatically create createdAt, updatedAt, deletedAt
  timestamps: true,
  // Don't create updatedAt
  updatedAt: false,
  // Use soft-deletes!
  paranoid: true,
});
