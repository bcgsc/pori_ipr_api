module.exports = {
  up: (queryInterface, Sq) => {
    return queryInterface.addColumn('reports', 'template_id', {
      type: Sq.INTEGER,
      references: {
        model: 'templates',
        key: 'id',
      },
      allowNull: true,
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
