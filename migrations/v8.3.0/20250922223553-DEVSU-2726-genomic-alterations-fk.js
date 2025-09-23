const {KB_PIVOT_MAPPING} = require('../../app/constants');

const TABLE = 'reports_summary_genomic_alterations_identified';

module.exports = {
  async up(queryInterface, Sq) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        TABLE,
        'variant_type',
        {
          type: Sq.ENUM(...Object.keys(KB_PIVOT_MAPPING)),
        },
        {transaction},
      );
      await queryInterface.addColumn(
        TABLE,
        'variant_id',
        {
          type: Sq.INTEGER,
        },
        {transaction},
      );
    });
  },

  async down() {
    throw new Error('Not Implemented!');
  },
};
