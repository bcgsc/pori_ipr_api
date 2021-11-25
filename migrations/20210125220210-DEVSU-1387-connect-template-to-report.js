const {v4: uuidv4} = require('uuid');

const TEMPLATES_TABLE = 'templates';
const REPORTS_TABLE = 'reports';

module.exports = {
  up: (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // Add genomic and probe template to templates table
      const result = await queryInterface.bulkInsert(TEMPLATES_TABLE, [
        {
          ident: uuidv4(),
          name: 'genomic',
          organization: 'BC Cancer',
          sections: JSON.stringify([
            'summary', 'analyst-comments', 'pathway-analysis', 'therapeutic-targets',
            'kb-matches', 'slides', 'discussion', 'microbial', 'expression-correlation',
            'mutation-signatures', 'mutation-burden', 'immune', 'small-mutations',
            'copy-number', 'structural-variants', 'expression', 'appendices',
          ]),
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          ident: uuidv4(),
          name: 'probe',
          organization: 'BC Cancer',
          sections: JSON.stringify([
            'summary', 'kb-matches', 'appendices',
          ]),
          created_at: new Date(),
          updated_at: new Date(),
        },
      ], {transaction, returning: true});

      // Get id of newly added genomic template and probe template
      const [genomicTemplateId, probeTemplateId] = (result[0].name === 'genomic') ? [result[0].id, result[1].id] : [result[1].id, result[0].id];

      // Add column (allow null for now)
      await queryInterface.addColumn(REPORTS_TABLE, 'template_id', {
        type: Sq.INTEGER,
        references: {
          model: 'templates',
          key: 'id',
        },
        allowNull: true,
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      }, {transaction});

      // Set genomic reports to now point to genomic template
      await queryInterface.bulkUpdate(REPORTS_TABLE, {template_id: genomicTemplateId}, {type: 'genomic'}, {transaction});

      // Set probe reports to now point to probe template
      await queryInterface.bulkUpdate(REPORTS_TABLE, {template_id: probeTemplateId}, {type: 'probe'}, {transaction});

      // Remove type field
      await queryInterface.removeColumn(REPORTS_TABLE, 'type', {transaction});

      // Set template_id field to now not allowNull
      return queryInterface.changeColumn(REPORTS_TABLE, 'template_id', {
        type: Sq.INTEGER,
        allowNull: false,
      }, {transaction});
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
