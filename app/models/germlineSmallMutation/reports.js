const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');
const clearCache = require('../clearCache');

module.exports = (sequelize, Sq) => {
  const germlineReport = sequelize.define('germlineSmallMutation', {
    ...DEFAULT_COLUMNS,
    patientId: {
      name: 'patientId',
      field: 'patient_id',
      type: Sq.TEXT,
      allowNull: false,
    },
    biopsyName: {
      name: 'biopsyName',
      field: 'biopsy_name',
      allowNull: false,
      type: Sq.TEXT,
    },
    normalLibrary: {
      name: 'normalLibrary',
      field: 'normal_library',
      type: Sq.TEXT,
    },
    sourceVersion: {
      name: 'sourceVersion',
      field: 'source_version',
      type: Sq.TEXT,
      allowNull: false,
    },
    sourcePath: {
      name: 'sourcePath',
      field: 'source_path',
      type: Sq.TEXT,
      allowNull: false,
    },
    biofxAssignedId: {
      name: 'biofxAssignedId',
      field: 'biofx_assigned_id',
      type: Sq.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    exported: {
      type: Sq.BOOLEAN,
      defaultValue: false,
    },
    state: {
      type: Sq.ENUM('ready', 'active', 'uploaded', 'signedoff', 'archived', 'reviewed', 'nonproduction', null),
      defaultValue: 'uploaded',
    },
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'germline_small_mutations',
    scopes: {
      public: {
        order: [['createdAt', 'desc']],
        attributes: {
          exclude: ['id', 'biofxAssignedId', 'deletedAt', 'updatedBy'],
        },
        include: [
          {as: 'biofxAssigned', model: sequelize.models.user.scope('public'), required: true},
          {as: 'projects', model: sequelize.models.project.scope('public'), through: {attributes: []}},
          {
            as: 'users',
            model: sequelize.models.germlineReportUser,
            attributes: {
              exclude: ['id', 'germlineReportId', 'user_id', 'addedById', 'deletedAt', 'updatedBy'],
            },
            include: [
              {model: sequelize.models.user.scope('public'), as: 'user'},
            ],
          },
          {
            as: 'variants',
            model: sequelize.models.germlineSmallMutationVariant,
            order: [['gene', 'asc']],
            attributes: {exclude: ['id', 'germlineReportId', 'deletedAt', 'updatedBy']},
          },
          {
            as: 'reviews',
            model: sequelize.models.germlineSmallMutationReview,
            attributes: {exclude: ['id', 'germlineReportId', 'reviewerId', 'deletedAt', 'updatedBy']},
            include: [{model: sequelize.models.user.scope('public'), as: 'reviewer'}],
          },
        ],
      },
    },
    hooks: {
      ...DEFAULT_OPTIONS.hooks,
      // NOTE: This hook only gets triggered on instance.destroy or
      // when individualHooks is set to true
      afterDestroy: async (instance, options = {force: false}) => {
        if (options.force === true) {
          // When hard deleting a report, also delete the "updated" versions of the report
          return Promise.all([
            clearCache(instance, 'DELETE'),
            instance.constructor.destroy({where: {ident: instance.ident}, force: true}),
          ]);
        }

        // Remove review and variant on soft-delete
        return Promise.all([
          clearCache(instance, 'DELETE'),
          sequelize.models.germlineSmallMutationReview.destroy({where: {germlineReportId: instance.id}}),
          sequelize.models.germlineSmallMutationVariant.destroy({where: {germlineReportId: instance.id}}),
        ]);
      },
    },
  });

  // set instance methods
  germlineReport.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, biofxAssignedId, deletedAt, updatedBy, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return germlineReport;
};
