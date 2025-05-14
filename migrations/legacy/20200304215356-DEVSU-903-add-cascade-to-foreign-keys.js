const GERMLINE_REPORTS_TO_PROJECTS_TABLE = 'germline_reports_to_projects';
const REPORT_PROJECTS_TABLE = 'report_projects';
const GERMLINE_REP_TO_PROJ_REPORT_ID_FK = 'germline_reports_to_projects_germline_report_id_fkey';
const GERMLINE_REP_TO_PROJ_PROJECT_ID_FK = 'germline_reports_to_projects_project_id_fkey';
const REP_PROJ_PROJECT_ID_FK = 'report_projects_project_id_fkey';
const REP_PROJ_REPORT_ID_FK = 'report_projects_report_id_fkey';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Remove old incorrect foreign keys
      await Promise.all([
        queryInterface.removeConstraint(GERMLINE_REPORTS_TO_PROJECTS_TABLE, GERMLINE_REP_TO_PROJ_REPORT_ID_FK, {transaction}),
        queryInterface.removeConstraint(GERMLINE_REPORTS_TO_PROJECTS_TABLE, GERMLINE_REP_TO_PROJ_PROJECT_ID_FK, {transaction}),
        queryInterface.removeConstraint(REPORT_PROJECTS_TABLE, REP_PROJ_PROJECT_ID_FK, {transaction}),
        queryInterface.removeConstraint(REPORT_PROJECTS_TABLE, REP_PROJ_REPORT_ID_FK, {transaction}),
      ]);

      // Add new correct foreign keys
      return Promise.all([
        queryInterface.addConstraint(GERMLINE_REPORTS_TO_PROJECTS_TABLE, {
          fields: ['germline_report_id'],
          type: 'foreign key',
          name: GERMLINE_REP_TO_PROJ_REPORT_ID_FK,
          references: {
            table: 'germline_small_mutations',
            field: 'id',
          },
          onDelete: 'cascade',
          onUpdate: 'cascade',
          transaction,
        }),
        queryInterface.addConstraint(GERMLINE_REPORTS_TO_PROJECTS_TABLE, {
          fields: ['project_id'],
          type: 'foreign key',
          name: GERMLINE_REP_TO_PROJ_PROJECT_ID_FK,
          references: {
            table: 'projects',
            field: 'id',
          },
          onDelete: 'cascade',
          onUpdate: 'cascade',
          transaction,
        }),
        queryInterface.addConstraint(REPORT_PROJECTS_TABLE, {
          fields: ['project_id'],
          type: 'foreign key',
          name: REP_PROJ_PROJECT_ID_FK,
          references: {
            table: 'projects',
            field: 'id',
          },
          onDelete: 'cascade',
          onUpdate: 'cascade',
          transaction,
        }),
        queryInterface.addConstraint(REPORT_PROJECTS_TABLE, {
          fields: ['report_id'],
          type: 'foreign key',
          name: REP_PROJ_REPORT_ID_FK,
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
  },

  down: () => {
    throw new Error('Not Implemented');
  },
};
