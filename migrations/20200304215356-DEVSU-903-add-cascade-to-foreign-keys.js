module.exports = {
  up: async (queryInterface) => {
    try {
      await queryInterface.sequelize.transaction(async (transaction) => {
        // Remove old incorrect foreign keys
        await Promise.all([
          queryInterface.removeConstraint('germline_reports_to_projects', 'germline_reports_to_projects_germline_report_id_fkey', {transaction}),
          queryInterface.removeConstraint('germline_reports_to_projects', 'germline_reports_to_projects_project_id_fkey', {transaction}),
          queryInterface.removeConstraint('report_projects', 'report_projects_project_id_fkey', {transaction}),
          queryInterface.removeConstraint('report_projects', 'report_projects_report_id_fkey', {transaction}),
        ]);

        // Add new correct foreign keys
        return Promise.all([
          queryInterface.addConstraint('germline_reports_to_projects', ['germline_report_id'], {
            type: 'foreign key',
            name: 'germline_reports_to_projects_germline_report_id_fkey',
            references: {
              table: 'germline_small_mutations',
              field: 'id',
            },
            onDelete: 'cascade',
            onUpdate: 'cascade',
            transaction,
          }),
          queryInterface.addConstraint('germline_reports_to_projects', ['project_id'], {
            type: 'foreign key',
            name: 'germline_reports_to_projects_project_id_fkey',
            references: {
              table: 'projects',
              field: 'id',
            },
            onDelete: 'cascade',
            onUpdate: 'cascade',
            transaction,
          }),
          queryInterface.addConstraint('report_projects', ['project_id'], {
            type: 'foreign key',
            name: 'report_projects_project_id_fkey',
            references: {
              table: 'projects',
              field: 'id',
            },
            onDelete: 'cascade',
            onUpdate: 'cascade',
            transaction,
          }),
          queryInterface.addConstraint('report_projects', ['report_id'], {
            type: 'foreign key',
            name: 'report_projects_report_id_fkey',
            references: {
              table: 'reports',
              field: 'id',
            },
            onDelete: 'cascade',
            onUpdate: 'cascade',
            transaction,
          }),
        ]);
      });
    } catch (error) {
      throw error;
    }
  },

  down: () => {
    throw new Error('Not Implemented');
  },
};
