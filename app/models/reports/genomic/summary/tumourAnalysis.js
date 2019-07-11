const Sq = require('sequelize');

module.exports = sequelize => sequelize.define('tumourAnalysis', {
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
  tumourContent: {
    type: Sq.INTEGER,
    allowNull: false,
  },
  ploidy: {
    type: Sq.TEXT,
    allowNull: false,
  },
  normalExpressionComparator: {
    type: Sq.TEXT,
  },
  diseaseExpressionComparator: {
    type: Sq.TEXT,
  },
  subtyping: {
    type: Sq.TEXT,
    allowNull: true,
    defaultValue: null,
  },
  tcgaColor: {
    type: Sq.TEXT,
  },
  mutationSignature: {
    type: Sq.JSONB,
    defaultValue: [],
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
  tableName: 'pog_analysis_reports_summary_tumour_analysis',
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
        exclude: ['deletedAt', 'pog_report_id', 'id', 'pog_id'],
      },
    },
  },
});
