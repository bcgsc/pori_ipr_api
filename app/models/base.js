const Sq = require('sequelize');
const {includesAll} = require('../libs/helperFunctions');
const clearCache = require('./clearCache');

const DEFAULT_UPDATE_EXCLUDE = ['updatedAt', 'updatedBy'];

const SIGNATURE_REMOVAL_EXCLUDE = {
  report: ['state', 'presentationDate', 'updatedAt', 'updatedBy'],
};

/**
 * Remove report signatures
 *
 * @param {object} instance - Instance of report section (Sequelize model)
 * @param {object} options - Additional options
 * @returns {undefined} - If no errors are thrown remove was successful
 */
const REMOVE_REPORT_SIGNATURES = (instance, options = {}) => {
  // check instance is a report section
  if (!instance.reportId) {
    return Promise.resolve(true);
  }

  // remove signatures
  return instance.sequelize.models.signatures.update({
    creatorId: null,
    creatorSignedAt: null,
    authorId: null,
    authorSignedAt: null,
    reviewerId: null,
    reviewerSignedAt: null,
  }, {
    where: {
      reportId: instance.reportId,
    },
    individualHooks: true,
    paranoid: true,
    transaction: options.transaction,
    // Note: This won't do anything now, but when the deletedBy
    // functionality is added it will
    userId: options.userId,
  });
};

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
  updatedBy: {
    name: 'updatedBy',
    field: 'updated_by',
    type: Sq.INTEGER,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  ...DEFAULT_MAPPING_COLUMNS,
};

const DEFAULT_MAPPING_OPTIONS = {
  // Automatically create createdAt, updatedAt, deletedAt
  timestamps: true,
  // Use soft-deletes!
  paranoid: true,
  // hooks
  hooks: {
    afterCreate: async (instance) => {
      return clearCache(instance, 'POST');
    },
    afterUpdate: async (instance) => {
      return clearCache(instance, 'PUT');
    },
    afterDestroy: async (instance) => {
      return clearCache(instance, 'DELETE');
    },
  },
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
    ...DEFAULT_MAPPING_OPTIONS.hooks,
    beforeUpdate: async (instance, options = {}) => {
      // check if the data has changed or if the fields updated
      // are excluded from creating a new record
      const changed = instance.changed();
      const updateExclude = (options.newEntryExclude) ? DEFAULT_UPDATE_EXCLUDE.concat(options.newEntryExclude) : DEFAULT_UPDATE_EXCLUDE;
      if (!changed || includesAll(updateExclude, changed)) {
        return Promise.resolve(true);
      }

      const {id, ...content} = instance._previousDataValues;

      // Set the updateBy value for update
      instance.updatedBy = options.userId;

      return instance.constructor.create({
        ...content, deletedAt: new Date(),
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

    afterUpdate: async (instance) => {
      return Promise.all([
        clearCache(instance, 'PUT'),
      ]);
    },
    afterCreate: async (instance) => {
      return Promise.all([
        clearCache(instance, 'POST'),
      ]);
    },
    afterDestroy: async (instance) => {
      return Promise.all([
        clearCache(instance, 'DELETE'),
      ]);
    },
  },
};

module.exports = {
  DEFAULT_MAPPING_OPTIONS,
  DEFAULT_MAPPING_COLUMNS,
  DEFAULT_OPTIONS,
  DEFAULT_COLUMNS,
  DEFAULT_REPORT_OPTIONS,
  REMOVE_REPORT_SIGNATURES,
};
