const TABLE = 'reports_kb_matched_statements';

module.exports = {
  async up(queryInterface, Sq) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        TABLE,
        'required_kb_matches',
        {
          type: Sq.ARRAY(Sq.TEXT),
        },
        {transaction},
      );
    });
  },

  async down() {
    throw new Error('Not Implemented!');
  },
};
