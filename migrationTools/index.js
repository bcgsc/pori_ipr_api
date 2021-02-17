
/**
 * Add a partial unique constraint to a table during a migration
 *
 * @param {Object} queryInterface queryInterface provided by the migration
 * @param {Object} Sequelize Sequelize instance provided by the migration
 * @param {Object} transaction Sequelize transaction instance
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


const wrapColumnNames = (names) => {
  return names.map((c) => {
    return `"${c}"`;
  });
};

const countDistinctRowFrequency = async (queryInterface, transaction, table, attributes) => {
  const columns = wrapColumnNames(attributes);
  const [{freq}] = await queryInterface.sequelize.query(
    `SELECT count(*) as freq FROM (SELECT DISTINCT ${columns.join(', ')} FROM ${table}) temp`,
    {transaction, type: queryInterface.sequelize.QueryTypes.SELECT}
  );
  return freq;
};


const removeActiveDuplicates = async (queryInterface, transaction, table, distinctColumns) => {
  const columns = wrapColumnNames(distinctColumns).join(', ');
  console.log(`removing duplicate rows from table ${table} based on columns (${distinctColumns.join(', ')})`);
  const sql = `DELETE FROM ${table} exp
  WHERE NOT EXISTS (
    SELECT * FROM (
      SELECT DISTINCT ON (${columns}) id, ${columns}
      FROM ${table}
      WHERE deleted_at IS NULL
      ORDER BY ${columns}, id
    ) exp2
    WHERE exp2.id = exp.id
  ) AND deleted_at IS NULL
  `;
  return queryInterface.sequelize.query(sql, {transaction});
};

const equalOrBothNull = (col1, col2) => {
  return `${col1} = ${col2} OR (${col1} IS NULL AND ${col2} IS NULL)`;
};


module.exports = {
  addUniqueActiveFieldIndex, countDistinctRowFrequency, removeActiveDuplicates, equalOrBothNull,
};
