const TABLE = 'reports_small_mutations';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(TABLE, 'exon', {
      type: Sequelize.TEXT,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(TABLE, 'exon');
  },
};
