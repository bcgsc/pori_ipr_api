const TEMPLATES_TABLE = 'templates_appendix';

module.exports = {
  up: (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(TEMPLATES_TABLE, 'project_id', {
        name: 'projectId',
        field: 'project_id',
        type: Sq.INTEGER,
        unique: false,
        allowNull: true,
        references: {
          model: 'projects',
          key: 'id',
        },
      }, {transaction});
      await queryInterface.sequelize.query(
        'DROP INDEX templates_appendix_template_id_index;',
        {transaction},
      );
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
