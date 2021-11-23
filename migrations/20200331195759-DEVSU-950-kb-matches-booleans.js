const TABLE = 'reports_kb_matches';

module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const matchedCancerColumn = 'matched_cancer';
      const approvedTherapyColumn = 'approved_therapy';

      await queryInterface.sequelize.query(
        `UPDATE ${TABLE} SET ${approvedTherapyColumn} = 'true'
      WHERE ${approvedTherapyColumn} = 'thisCancer'
        OR ${approvedTherapyColumn} = 'otherCancer'`,
        {transaction},
      );

      await queryInterface.sequelize.query(
        `UPDATE ${TABLE} SET ${approvedTherapyColumn} = 'false'
        WHERE ${approvedTherapyColumn} IS NULL`,
        {transaction},
      );

      await queryInterface.sequelize.query(
        `UPDATE ${TABLE} SET ${matchedCancerColumn} = 'false'
        WHERE ${matchedCancerColumn} IS NULL`,
        {transaction},
      );

      await queryInterface.changeColumn(TABLE, matchedCancerColumn, {
        type: `BOOLEAN USING CAST("${matchedCancerColumn}" as BOOLEAN)`,
        allowNull: false,
        default: false,
      }, {transaction});
      await queryInterface.changeColumn(TABLE, approvedTherapyColumn, {
        type: `BOOLEAN USING CAST("${approvedTherapyColumn}" as BOOLEAN)`,
        allowNull: false,
        default: false,
      }, {transaction});
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: () => {
    throw new Error('not implemented');
  },
};
