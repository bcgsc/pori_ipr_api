const Sq = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('germline_small_mutation', {
    id: {
      type: Sq.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ident: {
      type: Sq.UUID,
      unique: true,
      defaultValue: Sq.UUIDV4,
    },
    patientId: {
      type: Sq.TEXT,
      allowNull: false,
      required: true,
      name: 'patientId',
      field: 'patient_id',
    },
    biopsyName: {
      type: Sq.TEXT,
      allowNull: false,
      required: true,
      name: 'biopsyName',
      field: 'biopsy_name',
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
    tableName: 'pog_analysis_germline_small_mutations',
    // Automatically create createdAt, updatedAt, deletedAt
    timestamps: true,
    // Use soft-deletes!
    paranoid: true,
    scopes: {
      public: {
        order: [['createdAt', 'desc']],
        attributes: {
          exclude: ['deletedAt', 'id', 'biofx_assigned_id'],
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
