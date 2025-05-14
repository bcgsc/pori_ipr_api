const TABLE_NAME = 'reports_kb_matches';
const SV_TABLE = 'reports_structural_variants';

module.exports = {
  up: async (queryInterface, Sq) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('add not null and enum constraints to variant type');
      // add not null constraint and enum to the variantType column
      await queryInterface.changeColumn(TABLE_NAME, 'variant_type', {
        type: Sq.ENUM('sv', 'mut', 'cnv', 'exp', 'probe'),
        allowNull: false,
      }, {transaction});

      // add omic support column to SVs
      console.log(`add new column ${SV_TABLE}.omic_support`);
      await queryInterface.addColumn(SV_TABLE, 'omic_support', {type: Sq.BOOLEAN, default: false}, {transaction});
      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  },

  down: () => {
    throw Error('not implemented');
  },
};
