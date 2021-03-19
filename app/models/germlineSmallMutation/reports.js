const {DEFAULT_COLUMNS, DEFAULT_OPTIONS, CLEAR_CACHED_REPORTS} = require('../base');

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
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'germline_small_mutations',
    scopes: {
      public: {
        order: [['createdAt', 'desc']],
        attributes: {
          exclude: ['id', 'biofxAssignedId', 'deletedAt'],
        },
        include: [
          {as: 'biofxAssigned', model: sequelize.models.user.scope('public'), required: true},
          {as: 'projects', model: sequelize.models.project.scope('public'), through: {attributes: []}},
          {
            as: 'variants', model: sequelize.models.germlineSmallMutationVariant, order: [['gene', 'asc']], attributes: {exclude: ['id', 'germlineReportId', 'deletedAt']},
          },
          {
            as: 'reviews',
            model: sequelize.models.germlineSmallMutationReview,
            attributes: {exclude: ['id', 'germlineReportId', 'reviewerId', 'deletedAt']},
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
            CLEAR_CACHED_REPORTS(instance.constructor.name),
            instance.constructor.destroy({where: {ident: instance.ident}, force: true}),
          ]);
        }

        // Remove review and variant on soft-delete
        return Promise.all([
          CLEAR_CACHED_REPORTS(instance.constructor.name),
          sequelize.models.germlineSmallMutationReview.destroy({where: {germlineReportId: instance.id}}),
          sequelize.models.germlineSmallMutationVariant.destroy({where: {germlineReportId: instance.id}}),
        ]);
      },
    },
  });

  // set instance methods
  germlineReport.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, biofxAssignedId, deletedAt, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return germlineReport;
};
