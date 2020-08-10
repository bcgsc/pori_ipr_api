const IMAGES_TABLE = 'reports_image_data';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // Add new caption and title columns to images table
      return Promise.all([
        queryInterface.addColumn(IMAGES_TABLE, 'title', Sequelize.TEXT, {transaction}),
        queryInterface.addColumn(IMAGES_TABLE, 'caption', Sequelize.TEXT, {transaction}),
      ]);
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
