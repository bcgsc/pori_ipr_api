const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize) => {
  return sequelize.define('germline_small_mutation', {
    ...DEFAULT_COLUMNS,
    patientId: {
      name: 'patientId',
      field: 'patient_id',
      type: Sq.TEXT,
      allowNull: false,
      required: true,
    },
    biopsyName: {
      name: 'biopsyName',
      field: 'biopsy_name',
      type: Sq.TEXT,
      required: true,
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
      required: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    exported: {
      type: Sq.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    ...DEFAULT_OPTIONS,
    tableName: 'germline_small_mutations',
    scopes: {
      public: {
        order: [['createdAt', 'desc']],
        attributes: {
          exclude: ['id', 'biofx_assigned_id', 'deletedAt', 'germline_report_id'],
        },
        include: [
          {as: 'biofx_assigned', model: sequelize.models.user.scope('public')},
          {as: 'projects', model: sequelize.models.project},
          {
            as: 'variants', model: sequelize.models.germline_small_mutation_variant, separate: true, order: [['gene', 'asc']],
          },
          {
            as: 'reviews', model: sequelize.models.germline_small_mutation_review, separate: true, include: [{model: sequelize.models.user.scope('public'), as: 'reviewedBy'}],
          },
        ],
      },
    },
  });
};
