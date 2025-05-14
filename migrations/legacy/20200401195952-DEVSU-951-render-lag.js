module.exports = {
  up: async (queryInterface) => {
    const table = 'reports_kb_matches';
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addIndex(table, {
        name: `${table}_variant_id_index`.toLowerCase(),
        unique: false,
        fields: ['variant_id'],
      }, {transaction});

      await queryInterface.addIndex(table, {
        name: `${table}_variant_type_index`.toLowerCase(),
        unique: false,
        fields: ['variant_type'],
      }, {transaction});
      await transaction.commit();
    } catch (e) {
      // console.error(e);
      await transaction.rollback();
      throw e;
    }
  },

  down: () => {
    throw new Error('not implemented');
  },
};
