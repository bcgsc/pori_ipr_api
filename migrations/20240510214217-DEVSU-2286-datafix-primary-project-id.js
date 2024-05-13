module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // set primay_project_id same as project_id when there is only one project
      // related to the report
      await queryInterface.sequelize.query(
        `UPDATE reports
        SET primary_project_id = (SELECT project_id
                                  FROM report_projects
                                  WHERE report_id = reports.id)
        WHERE id IN
          (SELECT report_id
          FROM report_projects
          WHERE deleted_at IS NULL
          GROUP BY report_id
          HAVING COUNT (project_id) = 1)`,
        {type: queryInterface.sequelize.QueryTypes.UPDATE, transaction},
      );

      // set primay_project_id as POG when there are multiple projects
      // related to the report and POG in it
      await queryInterface.sequelize.query(
        `UPDATE reports
        SET primary_project_id = 1
        WHERE id IN
          (SELECT report_id
          FROM report_projects
          WHERE
          report_id IN
            (SELECT report_id
            FROM report_projects
            WHERE deleted_at IS NULL
            GROUP BY report_id
            HAVING COUNT (project_id) > 1)
          AND
          project_id = 1)`,
        {type: queryInterface.sequelize.QueryTypes.UPDATE, transaction},
      );

      // special cases
      await queryInterface.sequelize.query(
        `UPDATE reports
        SET primary_project_id =
          CASE
            WHEN id = 8673 THEN 13
            ELSE 12
          END
        WHERE id NOT IN
          (SELECT report_id
          FROM report_projects
          WHERE report_id IN
            (SELECT report_id
            FROM report_projects
            WHERE deleted_at IS NULL
            GROUP BY report_id
            HAVING COUNT (project_id) > 1)
          AND
            project_id = 1)
        AND
          id NOT IN
          (SELECT report_id
          FROM report_projects
          WHERE deleted_at IS NULL
          GROUP BY report_id
          HAVING COUNT (project_id) = 1)
        AND
          deleted_at IS NULL`,
        {type: queryInterface.sequelize.QueryTypes.UPDATE, transaction},
      );
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
