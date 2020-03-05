/**
 * Add a partial unique constraint to a table during a migration
 *
 * @param queryInterface queryInterface provided by the migration
 * @param Sequelize Sequelize instance provided by the migration
 * @param transaction Sequelize trnasaction instance
 * @param {string} table the table name
 * @param {Array.<string>} fields the field names
 */
const addUniqueActiveFieldIndex = async (queryInterface, Sequelize, transaction, table, fields) => {
  console.log(`adding a unique index on the non-deleted record for the table ${table} and columns ${fields.join(' ')}`);
  const indexName = `${table}_${fields.join('_')}_index`.toLowerCase();
  return queryInterface.addIndex(table, {
    name: indexName,
    unique: true,
    fields,
    where: {
      deleted_at: {
        [Sequelize.Op.eq]: null,
      },
    },
    transaction,
  });
};

module.exports = {addUniqueActiveFieldIndex};
