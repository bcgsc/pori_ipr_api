module.exports = {
  up: async (queryInterface, Sq) => {
    queryInterface.sequelize.query('ALTER TYPE enum_reports_kb_matches_variant_type ADD VALUE \'msi\'');
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
