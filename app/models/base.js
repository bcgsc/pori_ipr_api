const Sq = require('sequelize');
const {existsChecker} = require('../libs/helperFunctions');

const DEFAULT_UPDATE_EXCLUDE = ['updatedAt'];
const DEFAULT_MAPPING_COLUMNS = {
  id: {
    type: Sq.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  createdAt: {
    type: Sq.DATE,
    defaultValue: Sq.NOW,
    name: 'createdAt',
    field: 'created_at',
  },
  deletedAt: {
    type: Sq.DATE,
    name: 'deletedAt',
    field: 'deleted_at',
  },
  updatedAt: {
    type: Sq.DATE,
    name: 'updatedAt',
    field: 'updated_at',
  },
};

const DEFAULT_COLUMNS = {
  ident: {
    type: Sq.UUID,
    unique: false,
    defaultValue: Sq.UUIDV4,
    allowNull: false,
  },
  ...DEFAULT_MAPPING_COLUMNS,
};

const DEFAULT_MAPPING_OPTIONS = {
  // Automatically create createdAt, updatedAt, deletedAt
  timestamps: true,
  // Use soft-deletes!
  paranoid: true,
};

// basically everything except tablename can be here
const DEFAULT_OPTIONS = {
  ...DEFAULT_MAPPING_OPTIONS,
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
      // check if the data has changed or if the fields updated
      // are excluded from creating a new record
      const changed = instance.changed();
      if (!changed || existsChecker(DEFAULT_UPDATE_EXCLUDE, changed)) {
        return true;
      }

      const {id, ...content} = instance._previousDataValues;

      return instance.constructor.create({
        ...content, deletedAt: new Date().getTime(),
      }, {
        silent: true,
        transaction: options.transaction,
      });
    },
  },
};

const DEFAULT_REPORT_OPTIONS = {
  ...DEFAULT_OPTIONS,
  hooks: {
    ...DEFAULT_OPTIONS.hooks,

    afterUpdate: (instance, options = {}) => {
      // remove reviewer signature from report
      return instance.sequelize.models.analystComments.update({
        reviewerId: null,
        reviewerSignedAt: null,
      }, {
        where: {
          reportId: (instance.constructor.name === 'analysis_report') ? instance.id : instance.reportId,
        },
        individualHooks: true,
        paranoid: true,
        transaction: options.transaction,
      });
    },
  },
};

module.exports = {
  DEFAULT_MAPPING_OPTIONS,
  DEFAULT_MAPPING_COLUMNS,
  DEFAULT_OPTIONS,
  DEFAULT_COLUMNS,
  DEFAULT_REPORT_OPTIONS,
};
