const Sq = require('sequelize');

module.exports = sequelize => sequelize.define('outlier', {
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
  expType: {
    type: Sq.TEXT,
    defaultValue: 'rna',
  },
  outlierType: {
    type: Sq.STRING,
  },
  gene: {
    type: Sq.TEXT,
  },
  location: {
    type: Sq.TEXT,
  },
  copyChange: {
    type: Sq.TEXT,
  },
  lohState: {
    type: Sq.TEXT,
  },
  cnvState: {
    type: Sq.TEXT,
  },
  rnaReads: {
    type: Sq.TEXT,
  },
  rpkm: {
    type: Sq.FLOAT,
  },
  foldChange: {
    type: Sq.FLOAT,
  },
  expression_class: {
    type: Sq.TEXT,
    defaultValue: null,
  },

  tcgaPerc: {
    type: Sq.INTEGER,
  },
  tcgaPercCol: {
    type: Sq.TEXT,
    defaultValue: null,
  },
  tcgakIQR: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  tcgaQC: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  tcgaQCCol: {
    type: Sq.TEXT,
    defaultValue: null,
  },
  tcgaAvgPerc: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  tcgaAvgkIQR: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  tcgaAvgQC: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  tcgaAvgQCCol: {
    type: Sq.TEXT,
    defaultValue: null,
  },
  tcgaNormPerc: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  tcgaNormkIQR: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  ptxPerc: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  ptxkIQR: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  ptxQC: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  ptxPercCol: {
    type: Sq.TEXT,
    defaultValue: null,
  },
  ptxTotSampObs: {
    type: Sq.INTEGER,
    defaultValue: null,
  },
  ptxPogPerc: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  gtexComp: {
    type: Sq.TEXT,
    defaultValue: null,
  },
  gtexPerc: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  gtexFC: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  gtexkIQR: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  gtexAvgPerc: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  gtexAvgFC: {
    type: Sq.FLOAT,
    defaultValue: null,
  },
  gtexAvgkIQR: {
    type: Sq.FLOAT,
    defaultValue: null,
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
  tableName: 'pog_analysis_reports_expression_outlier',
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
