const Sq = require('sequelize');

const DEFAULT_COLUMNS = {
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
};

// basically everything except tablename can be here
const DEFAULT_OPTIONS = {
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
};

module.exports = {DEFAULT_COLUMNS, DEFAULT_OPTIONS};
