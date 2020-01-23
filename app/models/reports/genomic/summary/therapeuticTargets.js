const Sq = require('sequelize');

const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = (sequelize) => {
  return sequelize.define('therapeuticTarget', {
    ...DEFAULT_COLUMNS,
    report_id: {
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
      type: Sq.STRING,
      allowNull: true,
      defaultValue: null,
    },
    gene_graphkb_id: {
      type: Sq.STRING,
      defaultValue: null,
      allowNull: true,
    },
    variant: {
      type: Sq.STRING,
      allowNull: false,
    },
    variant_graphkb_id: {
      type: Sq.STRING,
      defaultValue: null,
      allowNull: true,
    },
    therapy: {
      type: Sq.STRING,
      allowNull: false,
    },
    therapy_graphkb_id: {
      type: Sq.STRING,
      defaultValue: null,
      allowNull: true,
    },
    context: {
      type: Sq.STRING,
      allowNull: false,
    },
    context_graphkb_id: {
      type: Sq.STRING,
      allowNull: true,
      defaultValue: null,
    },
    evidence_level: {
      type: Sq.STRING,
      allowNull: false,
    },
    evidence_level_graphkb_id: {
      type: Sq.STRING,
      allowNull: true,
      defaultValue: null,
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
        attributes: {exclude: ['id', 'deletedAt', 'report_id']},
      },
    },
  });
};
