const TABLE = 'reports';

module.exports = {
  up: async (queryInterface, Sq) => {
    return Promise.all([
      queryInterface.addColumn(
        TABLE,
        'primary_project_id',
        {
          type: Sq.INTEGER,
        },
      ),
      queryInterface.addConstraint(
        TABLE,
        {
          fields: ['primary_project_id'],
          type: 'foreign key',
          name: 'reports_primary_project_id_fkey',
          references: {
            table: 'projects',
            field: 'id',
          },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      ),
    ]);
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
