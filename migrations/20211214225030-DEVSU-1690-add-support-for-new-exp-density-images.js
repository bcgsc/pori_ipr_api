module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.query(
      'UPDATE reports_image_data SET key = \'expDensity.histogram.\' || split_part(key,\'.\', 2) WHERE key ILIKE \'expDensity.%\'',
    );
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
