module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      'ALTER TYPE enum_reports_comparators_analysis_role ADD VALUE :param1',
      {replacements: {param1: 'mutation burden SV (tertiary)'}},
    );
  },

  down: () => {
    throw new Error('Not implemented!');
  },
};
