module.exports = {
  async up(queryInterface, Sq) {
    await queryInterface.addColumn('templates', 'editable', {
      type: Sq.BOOLEAN,
      defaultValue: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('templates', 'editable');
  },
};
