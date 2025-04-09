module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      'ALTER TYPE enum_reports_comparators_analysis_role ADD VALUE :param1',
      {replacements: {param1: 'expression (internal pancancer cohort)'}},
    );
    await queryInterface.sequelize.query(
      'ALTER TYPE enum_reports_comparators_analysis_role ADD VALUE :param1',
      {replacements: {param1: 'expression (internal pancancer cohort QC)'}},
    );
  },

  down: () => {
    throw new Error('Not implemented!');
  },
};
