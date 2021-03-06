const Sq = require('sequelize');
const {includesAll} = require('../libs/helperFunctions');

const DEFAULT_UPDATE_EXCLUDE = ['updatedAt'];

const SIGNATURE_REMOVAL_EXCLUDE = {
  analysis_report: ['state', 'presentationDate', 'updatedAt'],
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
      const updateExclude = (options.newEntryExclude) ? DEFAULT_UPDATE_EXCLUDE.concat(options.newEntryExclude) : DEFAULT_UPDATE_EXCLUDE;
      if (!changed || includesAll(updateExclude, changed)) {
        return Promise.resolve(true);
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
      const modelName = instance.constructor.name;
      // check if the data has changed or if the fields updated
      // are excluded from removing the report signatures
      const changed = instance.changed();
      const updateExclude = SIGNATURE_REMOVAL_EXCLUDE[modelName] || DEFAULT_UPDATE_EXCLUDE;

      if (!changed || includesAll(updateExclude, changed)) {
        return Promise.resolve(true);
      }

      // remove signatures from report
      return instance.sequelize.models.signatures.update({
        authorId: null,
        authorSignedAt: null,
        reviewerId: null,
        reviewerSignedAt: null,
      }, {
        where: {
          reportId: (modelName === 'analysis_report') ? instance.id : instance.reportId,
        },
        individualHooks: true,
        paranoid: true,
        transaction: options.transaction,
      });
    },
    afterCreate: (instance, options = {}) => {
      return REMOVE_REPORT_SIGNATURES(instance, options);
    },
    afterDestroy: (instance, options = {}) => {
      return REMOVE_REPORT_SIGNATURES(instance, options);
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
