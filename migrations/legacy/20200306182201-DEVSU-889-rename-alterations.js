const TABLE_NAME = 'reports_dga_alterations';

const COLUMNS_TO_DROP = [
  'reportType',
  'newEntry',
  'effect',
  'kb_type',
  'kb_entry_type',
  'report',
];
const COLUMN_RENAMES = {
  therapeuticContext: 'context',
  kbVariant: 'kb_variant',
  kb_event_key: 'kb_variant_id',
  kb_entry_key: 'kb_statement_id',
  association: 'relevance',
  alterationType: 'category',
  approvedTherapy: 'approved_therapy',
  LOHRegion: 'loh_region',
  evidence: 'evidence_level',
  copyNumber: 'copy_number',
};

module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // remove the unused columns
      for (const col of COLUMNS_TO_DROP) {
        console.log(`Dropping the ${TABLE_NAME}.${col} column`);
        await queryInterface.removeColumn(TABLE_NAME, col, {transaction});
      }
      // snake case columns
      for (const [oldName, newName] of Object.entries(COLUMN_RENAMES)) {
        console.log(`Renaming column from ${TABLE_NAME}.${oldName} to ${newName}`);
        await queryInterface.renameColumn(TABLE_NAME, oldName, newName, {transaction});
      }
      // rename the table
      console.log(`Renaming table from ${TABLE_NAME} reports_kb_matches`);
      await queryInterface.renameTable(TABLE_NAME, 'reports_kb_matches', {transaction});
      await transaction.commit();
    } catch (e) {
      console.error(e);
      await transaction.rollback();
      throw e;
    }
  },

  down: () => {
    throw Error('not implemented');
  },
};
