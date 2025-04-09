/* eslint-disable camelcase */
const REPORT_TABLE_NAME = 'pog_analysis_germline_small_mutations';
const MAPPING_TABLE = 'germline_reports_to_projects';

module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('copy the project relationships from the analysis to the report table');
      const associations = await queryInterface.sequelize.query(`SELECT DISTINCT ON (gsm.id,  pp.project_id) gsm.id as germline_report_id, pp.project_id, pp."createdAt" as created_at, pp."updatedAt" as updated_at
          FROM ${REPORT_TABLE_NAME} gsm
          JOIN pog_analysis pa on (pa.id = gsm.pog_analysis_id)
          JOIN "POGs" pogs on (pogs.id = pa.pog_id)
          JOIN pog_projects pp on (pogs.id = pp.pog_id)
          WHERE pp."deletedAt" IS NULL
          ORDER BY gsm.id,  pp.project_id, pp."updatedAt", pp."createdAt"
        `, {transaction, type: queryInterface.sequelize.QueryTypes.SELECT});
      console.log(`inserting ${associations.length} associations`);
      await queryInterface.bulkInsert(
        MAPPING_TABLE,
        associations,
        {transaction},
      );

      // copy the projects by name from the 'project' string field on the pogs table
      const missingProjectLinks = await queryInterface.sequelize.query(`SELECT DISTINCT ON (name, gsm_projects.id) gsm_projects.id, name, created_at from (
            SELECT gsm.id, pogs.project as name, pogs.created_at
            FROM ${REPORT_TABLE_NAME} gsm
            JOIN pog_analysis pa on (pa.id = gsm.pog_analysis_id)
            JOIN "POGs" pogs on (pogs.id = pa.pog_id)
            WHERE gsm."deletedAt" IS NULL and pogs.project IS NOT NULL
        ) gsm_projects WHERE NOT EXISTS (
          SELECT * FROM projects p where p.name = gsm_projects.name
        ) order by name, gsm_projects.id, created_at
        `, {transaction, type: queryInterface.sequelize.QueryTypes.SELECT});
      const missingProjects = {};
      for (const {name, created_at} of missingProjectLinks) {
        const oldest = new Date(Math.min(created_at, missingProjects[name]
          ? missingProjects[name].created_at
          : created_at));
        missingProjects[name] = {name, created_at: oldest, updated_at: oldest};
      }

      console.log(`Creating ${Object.values(missingProjects).length} missing project entries`);
      const newProjects = await queryInterface.bulkInsert(
        'projects',
        Object.values(missingProjects),
        {transaction, returning: true},
      );

      const missingLinks = missingProjectLinks.map((rec) => {
        return {
          germline_report_id: rec.id,
          project_id: newProjects.find((proj) => {
            return proj.name === rec.name;
          }).id,
          created_at: rec.created_at,
          updated_at: rec.created_at,
        };
      });

      await queryInterface.bulkInsert(MAPPING_TABLE, missingLinks, {transaction});

      console.log('drop the FK column to analysis');
      await queryInterface.removeColumn(REPORT_TABLE_NAME, 'pog_analysis_id', {transaction});

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: () => {
    throw new Error('Not Implemented');
  },
};
