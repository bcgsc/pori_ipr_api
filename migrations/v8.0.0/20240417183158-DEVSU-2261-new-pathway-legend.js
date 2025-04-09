module.exports = {
  up: async (queryInterface) => {
    queryInterface.sequelize
      .query('ALTER TYPE enum_reports_summary_pathway_analysis_legend ADD VALUE \'v3\'');
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
