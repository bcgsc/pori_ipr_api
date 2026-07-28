module.exports = {
  up: async (queryInterface) => {
    // Add unique partial index to enforce only one default legend globally
    await queryInterface.addIndex('pathway_analysis_legends', {
      fields: ['default'],
      where: {
        default: true,
        deleted_at: null,
      },
      unique: true,
      name: 'idx_one_default_legend',
    });
  },

  down: async (queryInterface) => {
    // Remove the index if rollback is needed
    await queryInterface.removeIndex('pathway_analysis_legends', 'idx_one_default_legend');
  },
};
