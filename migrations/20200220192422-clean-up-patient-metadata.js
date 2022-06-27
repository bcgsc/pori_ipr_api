module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Create report_project table
      await queryInterface.createTable(
        'report_projects',
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          report_id: {
            type: Sequelize.INTEGER,
            unique: false,
            allowNull: false,
            references: {
              model: 'pog_analysis_reports',
              key: 'id',
            },
          },
          project_id: {
            type: Sequelize.INTEGER,
            unique: false,
            allowNull: false,
            references: {
              model: 'projects',
              key: 'id',
            },
          },
          createdAt: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW,
            name: 'createdAt',
            field: 'created_at',
          },
          updatedAt: {
            type: Sequelize.DATE,
            name: 'updatedAt',
            field: 'updated_at',
          },
          deletedAt: {
            type: Sequelize.DATE,
            name: 'deletedAt',
            field: 'deleted_at',
          },
        },
        {transaction},
      );
    });
  },

  down: () => {
    throw new Error('Not implemented');
  },
};
