module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.query(
      'ALTER TYPE "enum_detailedGenomicAnalysis.alterations_alterationType" ADD VALUE :param1',
      {replacements: {param1: 'pharmacogenomic'}},
    );
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
