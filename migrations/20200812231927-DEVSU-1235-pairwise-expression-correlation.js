const NEW_TABLE = 'reports_pairwise_expression_correlation';

module.exports = {
  up: (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // create the new table
      await queryInterface.createTable(NEW_TABLE, {
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
        ident: {
          type: Sq.UUID,
          unique: false,
          defaultValue: Sq.UUIDV4,
          allowNull: false,
        },
        reportId: {
          name: 'reportId',
          field: 'report_id',
          type: Sq.INTEGER,
          references: {
            model: 'reports',
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
          allowNull: false,
        },
        patientId: {
          name: 'patientId',
          field: 'patient_id',
          type: Sq.TEXT,
          allowNull: false,
        },
        library: {
          type: Sq.TEXT,
        },
        correlation: {
          type: Sq.FLOAT,
          allowNull: false,
        },
        tumourType: {
          name: 'tumourType',
          field: 'tumour_type',
          type: Sq.TEXT,
        },
        tissueType: {
          name: 'tissueType',
          field: 'tissue_type',
          type: Sq.TEXT,
        },
        tumourContent: {
          name: 'tumourContent',
          field: 'tumour_content',
          type: Sq.FLOAT,
        },
      }, {transaction});
    });
  },

  down: () => {
    throw new Error('Not implemented!');
  },
};
