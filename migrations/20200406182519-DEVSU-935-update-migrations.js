module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('reports_patient_information', 'POGID', {transaction});
      await queryInterface.renameColumn('reports_patient_information', 'tumourType', 'diagnosis', {transaction});

      await queryInterface.addColumn('reports', 'kbDiseaseMatch', {
        type: Sequelize.STRING,
        defaultValue: null,
      }, {transaction});

      await queryInterface.addColumn('reports', 'kbUrl', {
        type: Sequelize.STRING,
        defaultValue: 'https://ipr.bcgsc.ca/knowledgebase/references',
      }, {transaction});

      await queryInterface.addColumn('reports_genes', 'knownFusionPartner', {
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
