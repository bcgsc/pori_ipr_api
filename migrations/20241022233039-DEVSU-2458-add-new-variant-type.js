module.exports = {
  up: async (queryInterface) => {
    queryInterface.sequelize.query('ALTER TYPE enum_reports_kb_matches_variant_type ADD VALUE \'sigv\'');
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
