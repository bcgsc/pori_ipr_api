const TABLE = 'reports_genes';
const FOREIGN_KEY = 'reports_genes_report_id_fkey';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Remove old foreign key
      await queryInterface.removeConstraint(TABLE, FOREIGN_KEY, {transaction});

      // Add new correct foreign key
      await queryInterface.addConstraint(TABLE, {
        fields: ['report_id'],
        type: 'foreign key',
        name: FOREIGN_KEY,
        references: {
          table: 'reports',
          field: 'id',
        },
        onDelete: 'cascade',
        onUpdate: 'cascade',
        transaction,
      });
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
