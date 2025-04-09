const TABLE = 'reports';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    const kbUrlColumn = 'kb_url';

    try {
      await queryInterface.removeColumn('reports_patient_information', 'POGID', {transaction});
      await queryInterface.renameColumn('reports_patient_information', 'tumourType', 'diagnosis', {transaction});

      await queryInterface.addColumn('reports', 'kb_disease_match', {
        type: Sequelize.STRING,
        defaultValue: null,
      }, {transaction});

      // Create kb_url column and set all values to 'https://ipr.bcgsc.ca/knowledgebase/references'
      await queryInterface.addColumn('reports', kbUrlColumn, {
        type: Sequelize.STRING,
        defaultValue: null,
      }, {transaction});
      await queryInterface.sequelize.query(
        `UPDATE ${TABLE} SET ${kbUrlColumn} = 'https://ipr.bcgsc.ca/knowledgebase/references'
        WHERE ${kbUrlColumn} IS NULL`,
        {transaction},
      );

      await queryInterface.addColumn('reports_genes', 'known_fusion_partner', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }, {transaction});

      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
