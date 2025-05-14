/**
 * Data cleaning on the individual variant tables
 */
const {
  addUniqueActiveFieldIndex,
  countDistinctRowFrequency,
  removeActiveDuplicates,
} = require('../../migrationTools');

const EXP_TABLE = 'reports_expression_variants';
const CNV_TABLE = 'reports_copy_variants';
const MUT_TABLE = 'reports_small_mutations';
const SV_TABLE = 'reports_structural_variants';

const cleanExpressionData = async (queryInterface, Sq, transaction) => {
  console.log(`remove duplicates from the ${EXP_TABLE} table`);
  const genesBefore = await countDistinctRowFrequency(queryInterface, transaction, EXP_TABLE, ['gene_id']);
  // collapse duplicates that only differed on non-essential information
  await removeActiveDuplicates(queryInterface, transaction, EXP_TABLE, ['gene_id', 'expression_class']);
  // remove na entries if there are other classifications
  await queryInterface.sequelize.query(
    `DELETE FROM ${EXP_TABLE} main_exp
      WHERE EXISTS (
        SELECT freq, exp.gene_id, expression_class from (
          SELECT gene_id, count(*) as freq
          FROM ${EXP_TABLE}
          group by gene_id
        ) foo
        JOIN ${EXP_TABLE} exp ON (foo.gene_id = exp.gene_id)
        WHERE foo.freq > 1
          AND foo.gene_id = main_exp.gene_id
      ) AND expression_class = 'na'
    `,
    {transaction},
  );

  // double check nothing we didn't expect to delete was deleted
  const genesAfter = await countDistinctRowFrequency(queryInterface, transaction, EXP_TABLE, ['gene_id']);
  if (genesBefore !== genesAfter) {
    throw new Error(`Removed more entries than expected. There are less genes (${genesAfter}) than there were previously (${genesBefore})`);
  }
  // add unique constraint on: report_id, gene_id, expression_class
  // if this fails there is something in the data that needs to be manually reviewed
  await addUniqueActiveFieldIndex(queryInterface, Sq, transaction, EXP_TABLE, ['gene_id']);
};

const cleanCopyNumberData = async (queryInterface, Sq, transaction) => {
  console.log(`remove duplicates from the ${CNV_TABLE} table`);

  const genesBefore = await countDistinctRowFrequency(queryInterface, transaction, CNV_TABLE, ['gene_id']);
  // collapse duplicates that only differed on non-essential information
  await removeActiveDuplicates(queryInterface, transaction, CNV_TABLE, ['gene_id', 'cnvState', 'lohState', 'start', 'end', 'chromosomeBand']);

  await addUniqueActiveFieldIndex(queryInterface, Sq, transaction, CNV_TABLE, ['gene_id']);

  const genesAfter = await countDistinctRowFrequency(queryInterface, transaction, CNV_TABLE, ['gene_id']);
  if (genesBefore !== genesAfter) {
    throw new Error(`Removed more entries than expected. There are less genes (${genesAfter}) than there were previously (${genesBefore})`);
  }
};

const cleanSmallMutationData = async (queryInterface, Sq, transaction) => {
  console.log(`remove duplicates from the ${MUT_TABLE} table`);

  console.log(`standardize ${MUT_TABLE} zygosity categories`);
  await queryInterface.sequelize.query(
    `UPDATE ${MUT_TABLE} SET zygosity = NULL
        WHERE zygosity in ('na', 'ns', '', 'nan [nan]')`,
    {
      transaction,
    },
  );
  console.log(`standardize ${MUT_TABLE} ref_alt NULL values`);
  await queryInterface.sequelize.query(
    `UPDATE ${MUT_TABLE} SET "ref_alt" = NULL
        WHERE "ref_alt" = 'na'`,
    {
      transaction,
    },
  );

  console.log(`fill the ${MUT_TABLE}.detected_in column base on tumour/RNA read counts`);
  await queryInterface.sequelize.query(
    `UPDATE ${MUT_TABLE} mut1 SET detected_in = CASE
      WHEN (
        alt_counts.tumour_alt1 + alt_counts.tumour_alt2 > 0
        AND alt_counts.rna_alt1 + alt_counts.rna_alt2 > 0
      ) THEN 'DNA/RNA'
      WHEN alt_counts.tumour_alt1 + alt_counts.tumour_alt2 > 0 THEN 'DNA'
      WHEN alt_counts.rna_alt1 + alt_counts.rna_alt2 > 0 THEN 'RNA'
      ELSE NULL
    END
    FROM (
      SELECT id,
      tumour_reads,
      rna_reads,
      CASE
          WHEN tumour_alt1 IN ('', 'na') THEN 0
          ELSE tumour_alt1::INTEGER
        END as tumour_alt1,
        CASE
          WHEN tumour_alt2 IN ('', 'na') THEN 0
          ELSE tumour_alt2::INTEGER
        END as tumour_alt2,
        CASE
          WHEN rna_alt1 IN ('', 'na') THEN 0
          ELSE rna_alt1::INTEGER
        END as rna_alt1,
        CASE
          WHEN rna_alt2 IN ('', 'na') THEN 0
          ELSE rna_alt2::INTEGER
        END as rna_alt2
      FROM (
        SELECT
          id,
          split_part(split_part("tumour_reads", '/', 2), ';', 1) tumour_alt1,
          split_part("tumour_reads", '/', 3) tumour_alt2,
          split_part(split_part("rna_reads", '/', 2), ';', 1) rna_alt1,
          split_part("rna_reads", '/', 3) rna_alt2,
          "tumour_reads" as tumour_reads,
          "rna_reads" as rna_reads
        FROM ${MUT_TABLE}
      ) raw_counts
    ) alt_counts
    WHERE mut1.id = alt_counts.id`,
    {
      transaction,
    },
  );

  const distinguishingColumns = ['gene_id', 'transcript', 'protein_change', 'location', 'ref_alt', 'zygosity'];

  console.log(`delete fs notation duplicates from the ${MUT_TABLE} table`);
  await queryInterface.sequelize.query(
    `DELETE FROM ${MUT_TABLE}
    WHERE id IN (
      SELECT mut1.id FROM ${MUT_TABLE} mut1
      JOIN ${MUT_TABLE} mut2 ON (
        mut1.gene_id = mut2.gene_id
        AND mut1.transcript = mut2.transcript
        AND mut1.location = mut2.location
        AND mut1."ref_alt" = mut2."ref_alt"
        AND mut1.zygosity = mut2.zygosity
        AND mut1.id != mut2.id
        AND mut2."protein_change" LIKE REPLACE(mut1."protein_change", 'fs', '%fs%')
      )
      WHERE mut1."protein_change" LIKE '%fs%'
    )`,
    {
      transaction,
    },
  );

  const genesBefore = await countDistinctRowFrequency(
    queryInterface,
    transaction,
    MUT_TABLE,
    distinguishingColumns,
  );

  // collapse duplicates that only differed on non-essential information
  await removeActiveDuplicates(queryInterface, transaction, MUT_TABLE, distinguishingColumns);

  const genesAfter = await countDistinctRowFrequency(
    queryInterface,
    transaction,
    MUT_TABLE,
    distinguishingColumns,
  );
  if (genesBefore !== genesAfter) {
    throw new Error(`Removed more entries than expected. There are less genes (${genesAfter}) than there were previously (${genesBefore})`);
  }
};

const cleanStructuralVariantData = async (queryInterface, Sq, transaction) => {
  console.log(`remove duplicates from the ${SV_TABLE} table`);
  const distinguishingColumns = [
    'breakpoint',
    'conventionalName',
    'ctermGene',
    'ctermTranscript',
    'detectedIn',
    'eventType',
    'exon1',
    'exon2',
    'frame',
    'gene1_id',
    'gene2_id',
    'mavis_product_id',
    'name',
    'ntermGene',
    'ntermTranscript',
    'report_id',
    'svg',
    'svgTitle',
  ];

  console.log('remove e prefix on exon columns');
  await queryInterface.sequelize.query(
    `UPDATE ${SV_TABLE} SET exon1 = REPLACE(exon1, 'e', ''), exon2 = REPLACE(exon2, 'e', '')
    WHERE exon1 LIKE 'e%' OR exon2 LIKE 'e%'`,
    {transaction},
  );
  await queryInterface.sequelize.query(
    `UPDATE ${SV_TABLE} SET exon1 = null
    WHERE exon1 = '' OR exon1 = 'na' OR exon1 = '?'`,
    {transaction},
  );
  await queryInterface.sequelize.query(
    `UPDATE ${SV_TABLE} SET exon2 = null
    WHERE exon2 = '' OR exon2 = 'na' OR exon2 = '?'`,
    {transaction},
  );
  console.log('standardize breakpoint notation');
  await queryInterface.sequelize.query(
    `UPDATE ${SV_TABLE} SET breakpoint = REPLACE(breakpoint, '/', '|')
    WHERE breakpoint like '%/%'`,
    {transaction},
  );

  // collapse duplicates that only differed on non-essential information
  await removeActiveDuplicates(queryInterface, transaction, SV_TABLE, distinguishingColumns);

  console.log(`set values of ${SV_TABLE}.omic_support base on svVariant`);
  await queryInterface.sequelize.query(
    `UPDATE ${SV_TABLE} set omic_support = TRUE  WHERE "svVariant" = 'fusionOmicSupport'`,
    {transaction},
  );
  console.log(`drop the ${SV_TABLE}.svVariant column`);
  await queryInterface.removeColumn(SV_TABLE, 'svVariant', {transaction});
};

module.exports = {
  up: async (queryInterface, Sq) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await cleanExpressionData(queryInterface, Sq, transaction);
      await cleanCopyNumberData(queryInterface, Sq, transaction);
      await cleanSmallMutationData(queryInterface, Sq, transaction);
      await cleanStructuralVariantData(queryInterface, Sq, transaction);
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
