const Sq = require('sequelize');

const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = (sequelize) => {
  return sequelize.define('therapeuticTarget', {
    ...DEFAULT_COLUMNS,
    reportId: {
      field: 'report_id',
      type: Sq.INTEGER,
      references: {
        model: 'pog_analysis_reports',
        key: 'id',
      },
    },
    type: {
      type: Sq.ENUM('therapeutic', 'chemoresistance'),
      allowNull: false,
    },
    rank: {
      type: Sq.INTEGER,
      defaultValue: 0,
    },
    gene: {
      type: Sq.TEXT,
      defaultValue: null,
    },
    geneGraphkbId: {
      name: 'geneGraphkbId',
      field: 'gene_graphkb_id',
      type: Sq.TEXT,
      defaultValue: null,
    },
    variant: {
      type: Sq.TEXT,
      allowNull: false,
    },
    variantGraphkbId: {
      name: 'variantGraphkbId',
      type: Sq.TEXT,
      defaultValue: null,
      field: 'variant_graphkb_id',
    },
    therapy: {
      type: Sq.STRING,
      allowNull: false,
    },
    therapyGraphkbId: {
      name: 'therapyGraphkbId',
      type: Sq.TEXT,
      field: 'therapy_graphkb_id',
      defaultValue: null,
    },
    context: {
      type: Sq.TEXT,
      allowNull: false,
    },
    contextGraphkbId: {
      name: 'contextGraphkbId',
      field: 'context_graphkb_id',
      type: Sq.TEXT,
      defaultValue: null,
    },
    evidenceLevel: {
      name: 'evidenceLevel',
      field: 'evidence_level',
      type: Sq.TEXT,
      defaultValue: null,
    },
    evidenceLevelGraphkbId: {
      name: 'evidenceLevelGraphkbId',
      type: Sq.TEXT,
      defaultValue: null,
      field: 'evidence_level_graphkb_id',
    },
    notes: {
      type: Sq.TEXT,
    },
  },
  {
    ...DEFAULT_OPTIONS,
    tableName: 'pog_analysis_reports_therapeutic_targets',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'deletedAt', 'reportId']},
      },
    },
  });
};
