module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.query(
      `
      ALTER TYPE "enum_detailedGenomicAnalysis.alterations_alterationType" 
      ADD VALUE 'cancer predisposition'`,
    );
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
