module.exports = {
  async up(queryInterface, Sq) {
    await queryInterface.addColumn('templates', 'editable', {
      type: Sq.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('templates', 'editable');
  },
};
