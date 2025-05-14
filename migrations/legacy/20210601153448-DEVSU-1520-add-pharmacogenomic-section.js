module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.query(
      `
        UPDATE templates
        SET sections = sections || '["pharmacogenomic"]'::jsonb
        WHERE name = 'genomic';
      `,
    );
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
