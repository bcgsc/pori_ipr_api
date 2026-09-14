const VARIANT_TEXTS_TABLE = 'variant_texts';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      create unique index if not exists variant_text_unique_index
      on ${VARIANT_TEXTS_TABLE} ((array[
        variant_name,
        string_array_to_string(cancer_type, '', ''),
        template_id::text
      ]))
      where deleted_at is null;`);
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
