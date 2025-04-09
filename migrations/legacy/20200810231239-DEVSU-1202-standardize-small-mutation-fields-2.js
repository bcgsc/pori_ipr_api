const TABLE = 'reports_small_mutations';

module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // migrate data from the existing columns to the new column
      console.log('setting ref/alt sequences from ref_alt');
      await queryInterface.sequelize.query(
        `UPDATE ${TABLE} SET ref_seq = SPLIT_PART(ref_alt, '>', 1),
          alt_seq = SPLIT_PART(ref_alt, '>', 2)
          WHERE ref_alt LIKE '%>%'`,
        {transaction},
      );
      console.log('setting positions from location');
      await queryInterface.sequelize.query(
        `UPDATE ${TABLE} SET chromosome = SPLIT_PART(location, ':', 1),
          start_position = CASE
            WHEN SPLIT_PART(location, ':', 2) = '' THEN NULL
            WHEN SPLIT_PART(location, ':', 2) = 'na' THEN NULL
            ELSE SPLIT_PART(location, ':', 2)::INTEGER
          END,
          end_position = CASE
            WHEN SPLIT_PART(location, ':', 2) = '' THEN NULL
            WHEN SPLIT_PART(location, ':', 2) = 'na' THEN NULL
            ELSE SPLIT_PART(location, ':', 2)::INTEGER
          END
          WHERE location NOT LIKE '%:%-%'`,
        {transaction},
      );

      console.log('setting positions (ranges) from location');
      await queryInterface.sequelize.query(
        `UPDATE ${TABLE} SET chromosome = SPLIT_PART(location, ':', 1),
          start_position =  CASE
            WHEN SPLIT_PART(SPLIT_PART(location, ':', 2), '-', 1) = '' THEN NULL
            ELSE SPLIT_PART(SPLIT_PART(location, ':', 2), '-', 1)::INTEGER
          END,
          end_position = CASE
            WHEN SPLIT_PART(SPLIT_PART(location, ':', 2), '-', 2) = '' THEN NULL
            ELSE SPLIT_PART(SPLIT_PART(location, ':', 2), '-', 2)::INTEGER
          END
          WHERE location LIKE '%:%-%'`,
        {transaction},
      );

      console.log('choose the first ref/alt count');
      await queryInterface.sequelize.query(
        `UPDATE ${TABLE} SET tumour_reads = TRIM(SPLIT_PART(tumour_reads, ';', 1))
        WHERE tumour_reads LIKE '%;%'`,
        {transaction},
      );
      await queryInterface.sequelize.query(
        `UPDATE ${TABLE} SET rna_reads = TRIM(SPLIT_PART(rna_reads, ';', 1))
        WHERE rna_reads LIKE '%;%'`,
        {transaction},
      );

      console.log('setting ref/alt counts from tumour reads');
      await queryInterface.sequelize.query(
        `UPDATE ${TABLE} SET tumour_ref_count = CASE
            WHEN SPLIT_PART(tumour_reads, '/', 1) = '' THEN 0
            WHEN SPLIT_PART(tumour_reads, '/', 1) = 'na' THEN NULL
            ELSE SPLIT_PART(tumour_reads, '/', 1)::INTEGER
          END,
          tumour_alt_count = CASE
            WHEN SPLIT_PART(tumour_reads, '/', 2) = '' THEN 0
            WHEN SPLIT_PART(tumour_reads, '/', 2) = 'na' THEN NULL
            ELSE SPLIT_PART(tumour_reads, '/', 2)::INTEGER
          END
          WHERE tumour_reads IS NOT NULL AND tumour_reads != '' AND tumour_reads != '/'`,
        {transaction},
      );

      console.log('setting ref/alt counts from rna reads');
      await queryInterface.sequelize.query(
        `UPDATE ${TABLE} SET rna_ref_count = CASE
            WHEN SPLIT_PART(rna_reads, '/', 1) = '' THEN 0
            WHEN SPLIT_PART(rna_reads, '/', 1) = 'na' THEN NULL
            ELSE SPLIT_PART(rna_reads, '/', 1)::INTEGER
          END,
          rna_alt_count = CASE
            WHEN SPLIT_PART(rna_reads, '/', 2) = '' THEN 0
            WHEN SPLIT_PART(rna_reads, '/', 2) = 'na' THEN NULL
            ELSE SPLIT_PART(rna_reads, '/', 2)::INTEGER
          END
          WHERE rna_reads IS NOT NULL AND rna_reads != '' AND rna_reads != '/'`,
        {transaction},
      );

      console.log('drop redundant columns');
      await Promise.all(['rna_reads', 'tumour_reads', 'location', 'ref_alt'].map(async (col) => {
        return queryInterface.removeColumn(TABLE, col, {transaction});
      }));
    });
  },

  down: () => {
    throw new Error('Not implemented!');
  },
};
