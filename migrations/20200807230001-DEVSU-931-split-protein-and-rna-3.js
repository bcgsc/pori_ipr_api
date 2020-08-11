module.exports = {
  up: async (queryInterface) => {
    // add 'protein' variant type to kb-matches types
    await queryInterface.sequelize.query(
      'ALTER TYPE enum_reports_kb_matches_variant_type ADD VALUE :param1',
      {replacements: {param1: 'protein'}},
    );
  },

  down: () => {
    throw new Error('Not implemented!');
  },
};
