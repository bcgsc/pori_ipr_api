const TABLE = 'reports';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
          ALTER TABLE ${TABLE} ALTER COLUMN state
            DROP DEFAULT
        `, {transaction});

      await queryInterface.sequelize.query(`
          UPDATE ${TABLE} SET state = 'reviewed'
            WHERE state = 'presented'
        `, {transaction});

      await queryInterface.changeColumn(TABLE, 'state', {
        type: Sequelize.ENUM('ready', 'active', 'uploaded', 'signedoff', 'archived', 'reviewed', 'nonproduction'),
        allowNull: false,
      }, {transaction});

      return queryInterface.sequelize.query(`
          ALTER TABLE ${TABLE} ALTER COLUMN state
            SET DEFAULT 'ready'::enum_reports_state
        `, {transaction});
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
