module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize
      .query('CREATE UNIQUE INDEX variant_text_unique_index ON variant_texts ((ARRAY[variant_name, cancer_type, template_id::text, project_id::text])) where deleted_at is null;');
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
