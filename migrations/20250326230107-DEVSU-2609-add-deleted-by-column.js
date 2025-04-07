/* eslint-disable no-console */
/**
 * Add the FK column gene_id to each of the tables
 */

module.exports = {
  up: async (queryInterface, Sq) => {
    const ALL_TABLES = await queryInterface.showAllTables();
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.dir('add the FK deleted_by to the all tables');
      for (const table of ALL_TABLES) {
        console.dir(`Adding column ${table}.deleted_by (FK)`);
        await queryInterface.addColumn(
          table,
          'deleted_by',
          {
            type: Sq.INTEGER,
            references: {model: 'users', key: 'id'},
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          {transaction},
        );
      }
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: () => {
    throw Error('Not Implemented');
  },
};
