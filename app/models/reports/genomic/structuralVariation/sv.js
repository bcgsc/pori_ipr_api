const Sq = require('sequelize');

module.exports = sequelize => sequelize.define('sv', {
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
  mavis_product_id: {
    type: Sq.TEXT,
  },
  svVariant: {
    type: Sq.ENUM('clinical', 'nostic', 'biological', 'fusionOmicSupport'),
  },
  genes: {
    type: Sq.TEXT,
  },
  exons: {
    type: Sq.TEXT,
  },
  breakpoint: {
    type: Sq.TEXT,
  },
  eventType: {
    type: Sq.TEXT,
  },
  detectedIn: {
    type: Sq.TEXT,
  },
  conventionalName: {
    type: Sq.TEXT,
  },
  rpkm: {
    type: Sq.TEXT,
  },
  foldChange: {
    type: Sq.TEXT,
  },
  tcgaPerc: {
    type: Sq.TEXT,
  },
  svg: {
    type: Sq.TEXT,
    allowNull: true,
    defaultValue: null,
  },
  svgTitle: {
    type: Sq.TEXT,
    allowNull: true,
    defaultValue: null,
  },
  name: {
    type: Sq.TEXT,
    allowNull: true,
    defaultValue: null,
  },
  frame: {
    type: Sq.TEXT,
    allowNull: true,
    defaultValue: null,
  },
  ctermGene: {
    type: Sq.TEXT,
    allowNull: true,
    defaultValue: null,
  },
  ntermGene: {
    type: Sq.TEXT,
    allowNull: true,
    defaultValue: null,
  },
  ctermTranscript: {
    type: Sq.TEXT,
    allowNull: true,
    defaultValue: null,
  },
  ntermTranscript: {
    type: Sq.TEXT,
    allowNull: true,
    defaultValue: null,
  },
}, {
  // Table Name
  tableName: 'pog_analysis_reports_structural_variation_sv',
  // Automatically create createdAt, updatedAt, deletedAt
  timestamps: true,
  // Use soft-deletes!
  paranoid: true,
  scopes: {
    public: {
      attributes: {exclude: ['id', 'deletedAt', 'pog_report_id', 'pog_id']},
    },
  },
});
