module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query('ALTER TYPE enum_reports_state RENAME VALUE \'archived\' to \'completed\'');
    await queryInterface.sequelize.query('ALTER TYPE enum_germline_small_mutations_state RENAME VALUE \'archived\' to \'completed\'');
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
