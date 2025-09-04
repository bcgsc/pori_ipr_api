module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('reports_kb_match_join', 'flags', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('reports_kb_match_join', 'flags');
  },
};
