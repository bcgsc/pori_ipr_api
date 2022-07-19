const {v4: uuidv4} = require('uuid');
const Sq = require('sequelize');

/**
 * Complicated transform outlined in DEVSU-828
 *
 * @param {Array.<object>} records the original rows from the unmigrated db table
 *
 * @returns {Array.<object>} the new rows using the new columns and names
 */
const transformTherapeuticTargetData = (records) => {
  const newRecords = [];
  for (const record of records) {
    const therapies = [];

    // preference: use therapy if given, then pathway, then genes
    if (record.resistance) {
      therapies.push(record.resistance);
    } else if (record.targetContext) {
      therapies.push(`${record.targetContext} (targeted therapy)`);
    } else {
      therapies.push(...record.target.map((t) => {
        return `${t.geneVar || t} (targeted therapy)`;
      }));
    }

    for (const therapy of therapies) {
      for (const {entry: gene, context: variants} of record.biomarker) {
        for (const variant of variants) {
          const newRecord = {
            gene,
            variant,
            therapy,
            rank: record.rank,
            report_id: record.report_id,
            type: record.type,
            notes: record.notes,
            created_at: record.created_at,
            deleted_at: record.deleted_at,
            updated_at: record.updated_at,
            ident: uuidv4(),
            context: record.resistance
              ? 'resistance'
              : 'sensitivity',
          };
          newRecords.push(newRecord);
        }
      }
    }
  }
  return newRecords;
};

const NEW_COLUMNS = [
  {
    field: 'gene',
    type: Sq.TEXT,
    defaultValue: null,
  },
  {
    field: 'gene_graphkb_id',
    type: Sq.TEXT,
    defaultValue: null,
  },
  {
    field: 'variant',
    type: Sq.TEXT,
    allowNull: false,
  },
  {
    type: Sq.TEXT,
    defaultValue: null,
    field: 'variant_graphkb_id',
  },
  {
    field: 'therapy',
    type: Sq.TEXT,
    allowNull: false,
  },
  {
    type: Sq.TEXT,
    field: 'therapy_graphkb_id',
    defaultValue: null,
  },
  {
    field: 'context',
    type: Sq.TEXT,
    allowNull: false,
  },
  {
    field: 'context_graphkb_id',
    type: Sq.TEXT,
    defaultValue: null,
  },
  {
    field: 'evidence_level',
    type: Sq.TEXT,
    defaultValue: null,
  },
  {
    type: Sq.TEXT,
    defaultValue: null,
    field: 'evidence_level_graphkb_id',
  },
];

module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // fetch the current data and apply the transform
      console.log('Select all rows from pog_analysis_reports_therapeutic_targets');
      const records = await queryInterface.sequelize.query(
        'SELECT * FROM pog_analysis_reports_therapeutic_targets',
        {type: queryInterface.sequelize.QueryTypes.SELECT, transaction},
      );

      const newRecords = transformTherapeuticTargetData(records);
      console.log(`transformed ${records.length} records into ${newRecords.length} new records`);

      // drop all the current data
      console.log('Drop all rows from pog_analysis_reports_therapeutic_targets');
      await queryInterface.bulkDelete('pog_analysis_reports_therapeutic_targets', null, {transaction});

      // drop the old columns (that are not kept)
      const removedColumns = ['target', 'targetContext', 'resistance', 'biomarker', 'pog_id'];
      for (const col of removedColumns) {
        // not optimized b/c sequelize times out with Promise.all
        console.log(`Drop pog_analysis_reports_therapeutic_targets.${col}`);
        await queryInterface.removeColumn(
          'pog_analysis_reports_therapeutic_targets',
          col,
          {transaction},
        );
      }

      // create the new columns
      for (const {field, ...options} of NEW_COLUMNS) {
        // not optimized b/c sequelize times out with Promise.all
        console.log(`Add pog_analysis_reports_therapeutic_targets.${field}`);
        await queryInterface.addColumn(
          'pog_analysis_reports_therapeutic_targets',
          field,
          options,
          {transaction},
        );
      }
      console.log('Bulk insert the transformed data');
      // copy the data to the new table
      await queryInterface.bulkInsert(
        'pog_analysis_reports_therapeutic_targets',
        newRecords,
        {transaction},
      );
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: () => {
    throw new Error('The downgrade is not implemented as it is inherently a lossy transformation');
  },
};
