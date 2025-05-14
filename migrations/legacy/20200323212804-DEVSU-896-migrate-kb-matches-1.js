/**
 * Does the initial data cleaning on the kb matches table
 */
const KB_TABLE = 'reports_kb_matches';
const MUT_TABLE = 'reports_small_mutations';

module.exports = {
  up: async (queryInterface, Sq) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log(`create new column ${MUT_TABLE}.detected_in`);
      await queryInterface.addColumn(MUT_TABLE, 'detected_in', {type: Sq.TEXT}, {transaction});
      // create the variant_id column
      console.log('create the variant_id column');
      await queryInterface.addColumn(KB_TABLE, 'variant_id', {type: Sq.INTEGER}, {transaction});

      // add new enum type: SV, MUT, EXP, CNV
      // map empty varianType values to their correct values
      console.log('Fill in missing variantType values. Initialize to NULL');
      await queryInterface.sequelize.query(
        `UPDATE ${KB_TABLE} SET variant_type = NULL`,
        {transaction},
      );
      console.log('Mark expression variants');
      await queryInterface.sequelize.query(
        `UPDATE ${KB_TABLE} SET variant_type = 'exp', variant = lower(variant)
        WHERE lower(variant) LIKE '% express%'`,
        {transaction},
      );
      console.log('Mark copy variants');
      await queryInterface.sequelize.query(
        `UPDATE ${KB_TABLE} SET variant_type = 'cnv', variant = lower(variant)
        WHERE lower(variant) LIKE 'amplifi%'
          OR lower(variant) = 'copy loss'
          OR lower(variant) = 'copy gain'
          OR lower(variant) = 'homozygous loss'
          OR lower(variant) = 'homozygous deletion'
        `,
        {transaction},
      );
      console.log('Mark structural variants');
      await queryInterface.sequelize.query(
        `UPDATE ${KB_TABLE} SET variant_type = 'sv'
        WHERE variant LIKE '%e%:e%'
        `,
        {transaction},
      );
      console.log('Mark remaining variants as small mutations');
      await queryInterface.sequelize.query(
        `UPDATE ${KB_TABLE} SET variant_type = 'mut'
        WHERE variant_type IS NULL
        `,
        {transaction},
      );

      console.log('standardize kb-matches structural variant gene names');
      await queryInterface.sequelize.query(
        `UPDATE ${KB_TABLE} SET gene = split_part(variant, ' (', 1)
        WHERE variant_type = 'sv' AND variant like '%::%'`,
        {transaction},
      );
      console.log('standardize kb-matches structural variant variant names');
      await queryInterface.sequelize.query(
        `UPDATE ${KB_TABLE} SET variant = TRIM(REGEXP_REPLACE(
          REPLACE(variant, gene || ' ', ''),
          '[e()]',
          '',
          'g'
        ))
        WHERE variant_type = 'sv'`,
        {transaction},
      );
      console.log('trim gene whitespace');
      await queryInterface.sequelize.query(
        `UPDATE ${KB_TABLE} SET gene = TRIM(gene)`,
        {transaction},
      );

      console.log('standardize kb-matches expression variant categories');
      const categories = await queryInterface.sequelize.query(
        `SELECT DISTINCT variant FROM ${KB_TABLE} WHERE variant_type = :variantType`,
        {
          transaction,
          type: queryInterface.sequelize.QueryTypes.SELECT,
          replacements: {variantType: 'exp'},
        },
      );

      for (const {variant: cat} of categories) {
        let newCat = cat;
        if (cat.includes('increased')) {
          newCat = 'outlier_high';
        } else if (cat.includes('reduced')) {
          newCat = 'outlier_low';
        }
        console.log(`remapping kb-matches expression category from ${cat} to ${newCat}`);
        await queryInterface.sequelize.query(
          `UPDATE ${KB_TABLE} SET variant = :newCat
          WHERE variant_type = :variantType AND variant = :cat`,
          {
            transaction,
            replacements: {cat, variantType: 'exp', newCat},
          },
        );
      }

      console.log('standardize kb-matches copy variant categories');
      const copyCategories = await queryInterface.sequelize.query(
        `SELECT DISTINCT variant FROM ${KB_TABLE} WHERE variant_type = :variantType`,
        {
          transaction,
          type: queryInterface.sequelize.QueryTypes.SELECT,
          replacements: {variantType: 'cnv'},
        },
      );

      for (const {variant: cat} of copyCategories) {
        let newCat = '';
        if (cat.includes('loss')) {
          newCat = 'Loss';
        } else if (cat.includes('gain')) {
          newCat = 'Gain';
        } else if (/^amp\S*$/i.exec(cat)) {
          newCat = 'Amp';
        } else if (['homozygous deletion', 'homozygous loss'].includes(cat)) {
          newCat = 'Hom Loss';
        } else {
          throw new Error(`Re-mapping of cnv kb variant type (${cat}) not implemented`);
        }
        console.log(`remapping kb-matches copy category from ${cat} to ${newCat}`);
        await queryInterface.sequelize.query(
          `UPDATE ${KB_TABLE} SET variant = :newCat
          WHERE variant_type = :variantType AND variant = :cat`,
          {
            transaction,
            replacements: {cat, variantType: 'cnv', newCat},
          },
        );
      }

      console.log('standardize kb-matches zygosity categories');
      await queryInterface.sequelize.query(
        `UPDATE ${KB_TABLE} SET zygosity = NULL
        WHERE zygosity in ('na', 'ns', '')`,
        {
          transaction,
        },
      );
      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  },

  down: () => {
    throw Error('not implemented');
  },
};
