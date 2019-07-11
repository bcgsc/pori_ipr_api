const Sq = require('sequelize');

module.exports = sequelize => sequelize.define('patientInformation', {
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
  physician: {
    type: Sq.STRING,
    allowNull: false,
  },
  gender: {
    type: Sq.STRING,
    allowNull: true,
  },
  age: {
    type: Sq.STRING,
  },
  POGID: {
    type: Sq.STRING,
  },
  caseType: {
    type: Sq.STRING,
    allowNull: false,
  },
  tumourType: {
    type: Sq.STRING,
  },
  reportDate: {
    type: Sq.STRING,
  },
  biopsySite: {
    type: Sq.STRING,
  },
  tumourSample: {
    type: Sq.STRING,
  },
  tumourProtocol: {
    type: Sq.STRING,
  },
  constitutionalSample: {
    type: Sq.STRING,
  },
  constitutionalProtocol: {
    type: Sq.STRING,
  },
  pog_report_id: {
    type: Sq.INTEGER,
    allowNull: false,
    references: {
      model: 'pog_analysis_reports',
      key: 'id',
    },
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
  tableName: 'pog_patient_information',
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
