module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // Get project id's
      const [original] = await queryInterface.sequelize.query(`
        SELECT id FROM projects WHERE name = 'PanGen'
        `, {type: Sequelize.QueryTypes.SELECT, transaction});

      const [duplicate] = await queryInterface.sequelize.query(`
        SELECT id FROM projects WHERE name = 'PANGEN' AND deleted_at IS NULL
        `, {type: Sequelize.QueryTypes.SELECT, transaction});

      // update project id's as long as it doesn't create a duplicate
      await queryInterface.sequelize.query(`
        UPDATE report_projects AS rp SET project_id = ${original.id} 
          WHERE project_id = ${duplicate.id} AND 
          NOT EXISTS (
            SELECT id FROM report_projects WHERE report_id = rp.report_id AND project_id = ${original.id}
          )
        `, {transaction});

      await queryInterface.sequelize.query(`
        UPDATE germline_reports_to_projects AS grp SET project_id = ${original.id} 
          WHERE project_id = ${duplicate.id} AND 
          NOT EXISTS (
            SELECT id FROM germline_reports_to_projects WHERE germline_report_id = grp.germline_report_id AND project_id = ${original.id}
          )
        `, {transaction});

      // Remove duplicate project
      // Cascade should remove all references to this entry from the db
      return queryInterface.bulkDelete('projects', {name: 'PANGEN'}, {transaction, force: true});
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
