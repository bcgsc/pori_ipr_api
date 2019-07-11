const Sq = require('sequelize');

module.exports = sequelize => sequelize.define('alterations', {
  id: {
    type: Sq.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  ident: {
    type: Sq.UUID,
    unique: false,
    defaultValue: Sq.UUIDV4,
    notNull: true,
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
    allowNull: true,
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
  createdAt: {
    type: Sq.DATE,
    defaultValue: Sq.NOW,
    name: 'createdAt',
    field: 'created_at',
  },
  updatedAt: {
    type: Sq.DATE,
    name: 'updatedAt',
    field: 'updated_at',
  },
  deletedAt: {
    type: Sq.DATE,
    name: 'deletedAt',
    field: 'deleted_at',
  },
}, {
  // Table Name
  tableName: 'pog_analysis_reports_dga_alterations',
  // Automatically create createdAt, updatedAt, deletedAt
  timestamps: true,
  // Use soft-deletes!
  paranoid: true,
  // Convert all camel case to underscore seperated
  underscored: true,
  // Disable modification of table names
  freezeTableName: true,
  indexes: [
    {
      unique: true,
      fields: ['ident'],
      where: {
        deleted_at: {
          [Sq.Op.eq]: null,
        },
      },
    },
  ],
  hooks: {
    beforeUpdate: (instance, options = {}) => {
      const {id, ...content} = instance._previousDataValues;
      return instance.create({
        ...content, deletedAt: new Date().getTime(),
      }, {
        silent: true,
        transaction: options.transaction,
      });
    },
  },
  scopes: {
    public: {
      attributes: {exclude: ['id', 'deletedAt', 'pog_report_id', 'pog_id']},
    },
  },
});
