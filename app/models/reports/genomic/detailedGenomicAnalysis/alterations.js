const Sq = require('sequelize');

const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = sequelize => sequelize.define('alterations', {
  ...DEFAULT_COLUMNS,
  report_id: {
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
  alterationType: {
    type: Sq.ENUM('therapeutic', 'prognostic', 'diagnostic', 'biological', 'unknown', 'novel'),
    allowNull: false,
  },
  newEntry: {
    type: Sq.BOOLEAN,
    defaultValue: true,
  },
  approvedTherapy: {
    type: Sq.TEXT,
    defaultValue: null,
  },
  gene: {
    type: Sq.TEXT,
  },
  variant: {
    type: Sq.TEXT,
  },
  kbVariant: {
    type: Sq.TEXT,
  },
  disease: {
    type: Sq.TEXT,
  },
  effect: {
    type: Sq.TEXT,
  },
  association: {
    type: Sq.TEXT,
  },
  therapeuticContext: {
    type: Sq.TEXT,
  },
  status: {
    type: Sq.TEXT,
  },
  reference: {
    type: Sq.TEXT,
  },
  expression_tissue_fc: {
    type: Sq.TEXT,
  },
  expression_cancer_percentile: {
    type: Sq.TEXT,
  },
  copyNumber: {
    type: Sq.TEXT,
  },
  sample: {
    type: Sq.TEXT,
  },
  LOHRegion: {
    type: Sq.TEXT,
  },
  zygosity: {
    type: Sq.TEXT,
  },
  evidence: {
    type: Sq.TEXT,
  },
  matched_cancer: {
    type: Sq.TEXT,
  },
  pmid_ref: {
    type: Sq.TEXT,
  },
  variant_type: {
    type: Sq.TEXT,
  },
  kb_type: {
    type: Sq.TEXT,
  },
  kb_entry_type: {
    type: Sq.TEXT,
  },
  kb_event_key: {
    type: Sq.TEXT,
  },
  kb_entry_key: {
    type: Sq.TEXT,
  },
  kb_data: {
    type: Sq.JSONB,
  },
}, {
  ...DEFAULT_OPTIONS,
  // Table Name
  tableName: 'pog_analysis_reports_dga_alterations',
  scopes: {
    public: {
      attributes: {exclude: ['id', 'deletedAt', 'report_id']},
    },
  },
});
