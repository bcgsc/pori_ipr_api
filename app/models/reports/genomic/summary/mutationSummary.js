const Sq = require('sequelize');

module.exports = sequelize => sequelize.define('mutationSummary', {
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
  mutationSignature: {
    type: Sq.JSONB,
    defaultValue: [],
  },
  totalSNV: {
    type: Sq.TEXT,
  },
  totalIndel: {
    type: Sq.TEXT,
  },
  totalSV: {
    type: Sq.TEXT,
  },
  snvPercentileTCGA: {
    type: Sq.INTEGER,
  },
  snvPercentileDisease: {
    type: Sq.TEXT,
  },
  indelPercentileTCGA: {
    type: Sq.INTEGER,
  },
  indelPercentileDisease: {
    type: Sq.TEXT,
  },
  svPercentilePOG: {
    type: Sq.INTEGER,
  },
  snvPercentileTCGACategory: {
    type: Sq.TEXT,
  },
  snvPercentileDiseaseCategory: {
    type: Sq.TEXT,
  },
  indelPercentileTCGACategory: {
    type: Sq.TEXT,
  },
  indelPercentileDiseaseCategory: {
    type: Sq.TEXT,
  },
  svPercentilePOGCategory: {
    type: Sq.TEXT,
  },
  snvReportCategory: {
    type: Sq.TEXT,
  },
  indelReportCategory: {
    type: Sq.TEXT,
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
  tableName: 'pog_analysis_reports_summary_mutation_summary',
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
      attributes: {
        exclude: ['id', 'pog_id', 'pog_report_id', 'deletedAt'],
      },
    },
  },
});
