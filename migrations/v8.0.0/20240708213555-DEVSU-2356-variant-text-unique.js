module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize
      .query(`
        create function string_array_to_string(text[], text, text) returns text as $$
          select array_to_string($1, $2, $3)
        $$ language sql cost 1 immutable;`);

    await queryInterface.sequelize.query('CREATE UNIQUE INDEX variant_text_unique_index ON variant_texts ((ARRAY[variant_name, string_array_to_string(cancer_type, \'\', \'\'), template_id::text, project_id::text])) where deleted_at is null;');
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
