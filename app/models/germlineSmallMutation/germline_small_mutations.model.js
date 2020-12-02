const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize) => {
  const germlineReport = sequelize.define('germline_small_mutation', {
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
    source_version: {
      type: Sq.TEXT,
      allowNull: false,
    },
    source_path: {
      type: Sq.TEXT,
      allowNull: false,
    },
    biofx_assigned_id: {
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
          exclude: ['id', 'biofx_assigned_id', 'deletedAt'],
        },
        include: [
          {as: 'biofx_assigned', model: sequelize.models.user.scope('public')},
          {as: 'projects', model: sequelize.models.project.scope('public'), through: {attributes: []}},
          {
            as: 'variants', model: sequelize.models.germline_small_mutation_variant, order: [['gene', 'asc']], attributes: {exclude: ['id', 'germline_report_id', 'deletedAt']},
          },
          {
            as: 'reviews',
            model: sequelize.models.germline_small_mutation_review,
            attributes: {exclude: ['id', 'germline_report_id', 'reviewedBy_id', 'deletedAt']},
            include: [{model: sequelize.models.user.scope('public'), as: 'reviewedBy'}],
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
          return instance.constructor.destroy({where: {ident: instance.ident}, force: true});
        }

        // Remove review and variant on soft-delete
        return Promise.all([
          sequelize.models.germline_small_mutation_review.destroy({where: {germline_report_id: instance.id}}),
          sequelize.models.germline_small_mutation_variant.destroy({where: {germline_report_id: instance.id}}),
        ]);
      },
    },
  });

  // set instance methods
  germlineReport.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, biofx_assigned_id, deletedAt, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return germlineReport;
};
