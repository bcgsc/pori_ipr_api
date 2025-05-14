const IMAGES_TABLE = 'reports_image_data';

module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // Rename mutSignature keys in database
      return Promise.all([
        queryInterface.bulkUpdate(IMAGES_TABLE, {key: 'mutSignature.corPcors.sbs'}, {key: 'mutSignature.corPcors'}, {transaction}),
        queryInterface.bulkUpdate(IMAGES_TABLE, {key: 'mutSignature.barplot.sbs'}, {key: 'mutSignature.snvsAllStrelka'}, {transaction}),
      ]);
    });
  },

  down: () => {
    throw new Error('Not implemented!');
  },
};
