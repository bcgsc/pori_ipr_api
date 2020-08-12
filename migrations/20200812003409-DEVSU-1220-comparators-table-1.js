const NEW_TABLE = 'reports_comparators';

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
        analysisRole: {
          name: 'analysisRole',
          field: 'analysis_role',
          type: Sq.ENUM([
            'cibersort (primary)',
            'cibersort (secondary)',
            'mixcr (primary)',
            'mixcr (secondary)',
            'HRD (primary)',
            'HRD (secondary)',
            'expression (disease)',
            'expression (disease QC)',
            'expression (primary site)',
            'expression (primary site QC)',
            'expression (biopsy site)',
            'expression (biopsy site QC)',
            'mutation burden (primary)',
            'mutation burden (secondary)',
            'mutation burden (tertiary)',
            'mutation burden (quaternary)',
            'protein expression (primary)',
            'protein expression (secondary)',
          ]),
          allowNull: false,
        },
        name: {
          type: Sq.TEXT,
          allowNull: false,
        },
        version: {
          type: Sq.TEXT,
          defaultValue: null,
        },
        description: {
          type: Sq.TEXT,
          defaultValue: null,
        },
        size: {
          type: Sq.INTEGER,
          defaultValue: null,
        },
      }, {transaction});

      // add columns to reports
      await queryInterface.addColumn('reports', 'tumour_content', {type: Sq.FLOAT}, {transaction});
      await queryInterface.addColumn('reports', 'ploidy', {type: Sq.TEXT}, {transaction});
      await queryInterface.addColumn('reports', 'subtyping', {type: Sq.TEXT}, {transaction});

      await queryInterface.renameTable('reports_summary_mutation', 'reports_mutation_burden', {transaction});
      await queryInterface.addColumn('reports_mutation_burden', 'role', {type: Sq.ENUM(['primary', 'secondary', 'tertiary', 'quaternary'])}, {transaction});
    });
  },

  down: () => {
    throw new Error('Not implemented!');
  },
};
