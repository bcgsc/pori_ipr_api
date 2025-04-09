const {addUniqueActiveFieldIndex} = require('../../migrationTools');

const TABLE = 'reports_therapeutic_targets';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // get all the curren options for therapeutic rank. order first b
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query(
        `UPDATE ${TABLE} options set rank = reranked.new_rank - 1
        FROM (
          SELECT id,
            ROW_NUMBER() OVER (
                PARTITION BY report_id, type
                ORDER BY rank, context, gene, variant, id
            ) as new_rank
          FROM (
            SELECT * FROM ${TABLE} WHERE deleted_at IS NULL
          ) foo
        ) reranked
        WHERE reranked.id = options.id
        `,
        {transaction},
      );
      await addUniqueActiveFieldIndex(
        queryInterface,
        Sequelize,
        transaction,
        TABLE,
        ['report_id', 'type', 'rank'],
      );
      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  },

  down: () => {
    throw new Error('not implemented');
  },
};
