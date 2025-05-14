/**
 * Transfers the primary variant information from the kb-matches table to the
 * individual variant tables and links these records back to the
 * kb-matches table
 */
const {v4: uuidv4} = require('uuid');
const {equalOrBothNull} = require('../../migrationTools');

const KB_TABLE = 'reports_kb_matches';
const GENE_TABLE = 'reports_genes';
const EXP_TABLE = 'reports_expression_variants';
const CNV_TABLE = 'reports_copy_variants';
const MUT_TABLE = 'reports_small_mutations';
const SV_TABLE = 'reports_structural_variants';

const VARIANT_TABLES_MAP = {
  sv: SV_TABLE,
  mut: MUT_TABLE,
  exp: EXP_TABLE,
  cnv: CNV_TABLE,
};

const checkMissingMatches = async (queryInterface, transaction, variantType) => {
  const rows = await queryInterface.sequelize.query(
    `SELECT * FROM ${KB_TABLE} WHERE variant_type = :variantType AND variant_id IS NULL`,
    {
      transaction,
      type: queryInterface.sequelize.QueryTypes.SELECT,
      replacements: {variantType},
    },
  );
  if (rows.length) {
    throw new Error(`Failed to link ${variantType} variants (${rows.map((r) => {
      return r.id;
    })})`);
  }
};

const transferMissingVariants = async (queryInterface, transaction, variantType, targetColumn) => {
  const table = VARIANT_TABLES_MAP[variantType];
  console.log(`create missing ${variantType} variant in ${table} from ${KB_TABLE}`);

  // find the values which do not have an equivalent representation in the individual variant tables
  const missingVariants = await queryInterface.sequelize.query(
    `SELECT DISTINCT ON (kb.report_id, gene_id, "${targetColumn}") kb.report_id AS report_id,
        gene.id AS gene_id,
        kb.variant AS "${targetColumn}",
        kb.created_at,
        kb.updated_at
      FROM ${KB_TABLE} kb
      JOIN ${GENE_TABLE} gene ON (kb.gene = gene.name AND kb.report_id = gene.report_id)
      WHERE NOT EXISTS (
        SELECT *
        FROM ${table} mut
        WHERE mut.gene_id = gene.id
      ) AND kb.variant_type = :variantType`,
    {
      transaction,
      type: queryInterface.sequelize.QueryTypes.SELECT,
      replacements: {variantType},
    },
  );
  console.log(`copy missing variants (${missingVariants.length}) to the ${table} table`);
  if (missingVariants.length) {
    await queryInterface.bulkInsert(
      table,
      missingVariants.map((rec) => {
        return {...rec, ident: uuidv4()};
      }),
      {transaction},
    );
  }

  console.log(`set ${KB_TABLE}.variant_id for rows with variantType ${variantType}`);
  const rows = await queryInterface.sequelize.query(
    `SELECT *
    FROM (
      SELECT kb.id, count(*) AS freq
      FROM ${KB_TABLE} kb
      JOIN ${GENE_TABLE} gene ON (gene.name = kb.gene AND kb.report_id = gene.report_id)
      JOIN ${table} mut ON (gene.id = mut.gene_id)
      WHERE variant_type = :variantType
      GROUP BY kb.id
    ) foo WHERE foo.freq > 1`,
    {
      transaction,
      type: queryInterface.sequelize.QueryTypes.SELECT,
      replacements: {variantType},
    },
  );
  if (rows.length > 0) {
    throw new Error(`Duplicate mappings to kb matches table (${rows.slice(0, 10).map((r) => {
      return r.id;
    })}) from ${table}`);
  }

  await queryInterface.sequelize.query(
    `UPDATE ${KB_TABLE} main SET variant_id = foo.variant_id
    FROM (
      SELECT kb.id AS id, mut.id AS variant_id
      FROM ${KB_TABLE} kb
      JOIN ${GENE_TABLE} gene ON (gene.name = kb.gene and kb.report_id = gene.report_id)
      JOIN ${table} mut ON (gene.id = mut.gene_id)
      WHERE variant_type = :variantType
    ) foo
    WHERE foo.id = main.id`,
    {
      transaction,
      replacements: {variantType},
    },
  );
  // now check if any were unset
  await checkMissingMatches(queryInterface, transaction, variantType);
};

const transferKbExpressionData = async (queryInterface, Sq, transaction) => {
  const variantType = 'exp';
  const table = VARIANT_TABLES_MAP[variantType];
  // check that there are no manual data fixes required
  const multiMatch = await queryInterface.sequelize.query(
    `SELECT id, count(*) as freq FROM (
      SELECT DISTINCT mut.id, kb.variant
      FROM ${table} mut
      JOIN ${GENE_TABLE} gene ON (mut.gene_id = gene.id)
      JOIN ${KB_TABLE} kb ON (gene.name = kb.gene AND kb.report_id = gene.report_id)
      WHERE kb.variant_type = :variantType
        AND mut.expression_class IS NULL
    ) foo GROUP BY id HAVING count(*) > 1`,
    {
      transaction,
      type: queryInterface.sequelize.QueryTypes.SELECT,
      replacements: {variantType},
    },
  );

  if (multiMatch.length) {
    throw new Error(`Duplicate mappings (${multiMatch.slice(0, 10).map((r) => {
      return r.id;
    })}) from ${KB_TABLE} to ${table}`);
  }
  // update expression variants that don't have a expression_class using the kb variant if there is one
  console.log('updating null expression variants from kb matches');
  await queryInterface.sequelize.query(
    `UPDATE ${table} mut SET expression_class = kb.variant
    FROM ${KB_TABLE} kb
    JOIN ${GENE_TABLE} gene ON (gene.name = kb.gene AND kb.report_id = gene.report_id)
    WHERE kb.variant_type = :variantType
      AND mut.expression_class IS NULL
      AND mut.gene_id = gene.id`,
    {
      transaction,
      replacements: {variantType},
    },
  );

  await transferMissingVariants(queryInterface, transaction, variantType, 'expression_class');
};

const transferKbCopyData = async (queryInterface, Sq, transaction) => {
  await transferMissingVariants(queryInterface, transaction, 'cnv', 'cnvState');
};

const transferKbSmallMutationData = async (queryInterface, Sq, transaction) => {
  // find all the small mutations without equivalents already in the variant table
  const variantType = 'mut';
  // when there are multiple of the same protein change, prefer the higher zygosity

  const matchView = 'temp_match_mut_to_kb';

  console.log('create a view matching kb records to small mutations');
  // prefer variants (where match equivalent) with all values filled in, alpha sort transcripts, and higher location (HGVS)
  await queryInterface.sequelize.query(
    `CREATE TEMP VIEW ${matchView} AS SELECT DISTINCT ON (kb.id)
      kb.*,
      mut.id as matched_variant_id,
      gene.id as gene_id
    FROM ${KB_TABLE} kb
    LEFT JOIN ${GENE_TABLE} gene ON (kb.gene = gene.name AND kb.report_id = gene.report_id)
    LEFT JOIN ${MUT_TABLE} mut ON (
      mut.gene_id = gene.id
      AND (
        kb.variant = mut."protein_change"
        OR (
          kb.variant LIKE '%fs%'
          AND (
            kb.variant LIKE REPLACE(mut."protein_change", 'fs', '%fs%')
            OR mut."protein_change" LIKE REPLACE(kb.variant, 'fs', '%fs%')
          )
        )
      )
      AND (
        (kb.zygosity IS NULL AND mut.zygosity IS NULL)
        OR kb.zygosity = split_part(mut.zygosity, ' ', 1)
      )
    ) WHERE variant_type = :variantType
    ORDER BY kb.id, mut."ref_alt", mut.transcript, mut.location DESC, mut.id`, // prefer non-null ref_alt
    {
      transaction,
      replacements: {variantType},
    },
  );

  console.log(`create missing ${variantType} variant in ${MUT_TABLE} from ${KB_TABLE}`);

  // find the values which do not have an equivalent representation in the individual variant tables
  const missingVariants = await queryInterface.sequelize.query(
    `SELECT DISTINCT ON (gene_id, report_id, "protein_change", zygosity) gene_id,
        report_id,
        variant as "protein_change",
        zygosity,
        created_at,
        updated_at,
        deleted_at
      FROM ${matchView}
      WHERE matched_variant_id IS NULL
      ORDER BY gene_id, report_id, variant, zygosity, deleted_at DESC`,
    {
      transaction,
      type: queryInterface.sequelize.QueryTypes.SELECT,
      replacements: {variantType},
    },
  );
  console.log(`copy missing variants (${missingVariants.length}) to the ${MUT_TABLE} table`);
  if (missingVariants.length) {
    await queryInterface.bulkInsert(
      MUT_TABLE,
      missingVariants.map((rec) => {
        return {...rec, ident: uuidv4()};
      }),
      {transaction},
    );
  }

  console.log(`set ${KB_TABLE}.variant_id for rows with variantType ${variantType}`);
  await queryInterface.sequelize.query(
    `UPDATE ${KB_TABLE} main SET variant_id = m.matched_variant_id
    FROM ${matchView} m
    WHERE m.id = main.id`,
    {
      transaction,
    },
  );
  await queryInterface.sequelize.query(`DROP VIEW ${matchView}`, {transaction});
  // now check if any were unset
  await checkMissingMatches(queryInterface, transaction, variantType);
};

const transferKbStructuralVariantData = async (queryInterface, Sq, transaction) => {
  const variantType = 'sv';
  const svFromKbView = 'temp_sv_from_kb';
  // create temp view for the kb sv variants
  await queryInterface.sequelize.query(
    `CREATE TEMP VIEW ${svFromKbView} AS SELECT DISTINCT ON (kb.id,
      kb.report_id,
      g1.id,
      g2.id,
      kb.exon1,
      kb.exon2
    ) kb.id,
      kb.report_id,
      g1.id as gene1_id,
      g2.id as gene2_id,
      kb.exon1,
      kb.exon2,
      kb.created_at,
      kb.deleted_at,
      kb.updated_at
    FROM (
      SELECT id,
        report_id,
        CASE
          WHEN split_part(gene, '::', 1) = 'NA' THEN NULL
          ELSE split_part(gene, '::', 1)
        END as gene1_name,
        CASE
          WHEN split_part(gene, '::', 2) = 'NA' THEN NULL
          ELSE split_part(gene, '::', 2)
        END as gene2_name,
        CASE
          WHEN split_part(variant, ':', 1) = '?' THEN NULL
          ELSE split_part(variant, ':', 1)
        END as exon1,
        CASE
          WHEN split_part(variant, ':', 2) = '?' THEN NULL
          ELSE split_part(variant, ':', 2)
        END as exon2,
        updated_at,
        created_at,
        deleted_at
      FROM ${KB_TABLE}
      WHERE variant_type = :variantType
    ) kb
    LEFT JOIN ${GENE_TABLE} g1 ON (kb.report_id = g1.report_id AND kb.gene1_name = g1.name)
    LEFT JOIN ${GENE_TABLE} g2 ON (kb.report_id = g2.report_id AND kb.gene2_name = g2.name)
    `,
    {
      transaction,
      type: queryInterface.sequelize.QueryTypes.SELECT,
      replacements: {variantType},
    },
  );

  // create new SVs for any definitons on the KB table not matched in the individual SVs table
  const missingVariants = await queryInterface.sequelize.query(
    `SELECT DISTINCT ON (
      report_id,
      gene1_id,
      gene2_id,
      exon1,
      exon2
    ) report_id,
      gene1_id,
      gene2_id,
      exon1,
      exon2,
      created_at,
      deleted_at,
      updated_at
    FROM ${svFromKbView} kb
    WHERE NOT EXISTS (
      SELECT * FROM ${SV_TABLE} sv
      WHERE sv.report_id = kb.report_id
        AND (${equalOrBothNull('sv.gene1_id', 'kb.gene1_id')})
        AND (${equalOrBothNull('sv.gene2_id', 'kb.gene2_id')})
        AND (${equalOrBothNull('sv.exon1', 'kb.exon1')})
        AND (${equalOrBothNull('sv.exon2', 'kb.exon2')})
    )
    `,
    {
      transaction,
      type: queryInterface.sequelize.QueryTypes.SELECT,
      replacements: {variantType},
    },
  );
  console.log(`copy missing variants (${missingVariants.length}) to the ${SV_TABLE} table`);

  if (missingVariants.length) {
    await queryInterface.bulkInsert(
      SV_TABLE,
      missingVariants.map((rec) => {
        return {...rec, ident: uuidv4()};
      }),
      {transaction},
    );
  }

  const matchView = 'temp_sv_kb_matches';
  console.log(`create the matches view for links from ${KB_TABLE} to ${SV_TABLE}`);
  await queryInterface.sequelize.query(
    `CREATE TEMP VIEW ${matchView} AS SELECT DISTINCT ON (id) *
      FROM (
      SELECT
        kb.*,
        sv.id as sv_matched_id,
        sv.gene1_id as sv_gene1_id,
        sv.gene2_id as sv_gene2_id,
        sv.exon1 as sv_exon1,
        sv.exon2 as sv_exon2,
        CASE
          WHEN sv."eventType" = 'na' OR sv."eventType" IS NULL THEN 2
          WHEN sv."eventType" = 'Probe' THEN 1
          ELSE 0
        END as event_type_rank
      FROM ${svFromKbView} kb
      LEFT JOIN ${SV_TABLE} sv ON (
        sv.report_id = kb.report_id
        AND (${equalOrBothNull('sv.gene1_id', 'kb.gene1_id')})
        AND (${equalOrBothNull('sv.gene2_id', 'kb.gene2_id')})
        AND (${equalOrBothNull('sv.exon1', 'kb.exon1')})
        AND (${equalOrBothNull('sv.exon2', 'kb.exon2')})
      )
    ) foo ORDER BY id, deleted_at DESC, event_type_rank ASC, sv_matched_id`,
    {
      transaction,
    },
  );

  // link variants from the SV table to the KB table
  console.log('set reports_kb_matches.variant_id for rows with variantType sv');
  await queryInterface.sequelize.query(
    `UPDATE ${KB_TABLE} main SET variant_id = subq.sv_matched_id
    FROM ${matchView} subq
    WHERE main.variant_type = :variantType
      AND main.id = subq.id`,
    {
      transaction,
      replacements: {variantType},
    },
  );
  await queryInterface.sequelize.query(`DROP VIEW ${matchView}`, {transaction});
  await queryInterface.sequelize.query(`DROP VIEW ${svFromKbView}`, {transaction});
  // now check if any were unset
  await checkMissingMatches(queryInterface, transaction, variantType);
};

const transferKbGeneData = async (queryInterface, Sq, transaction) => {
  console.log('copy missing genes');
  const missingGenes = await queryInterface.sequelize.query(
    `SELECT DISTINCT ON (report_id, name) report_id, gene AS name, created_at, updated_at
        FROM ${KB_TABLE} kb
        WHERE NOT EXISTS (
          SELECT *
          FROM ${GENE_TABLE} gene
          WHERE gene.name = kb.gene AND gene.report_id = kb.report_id
        ) AND gene NOT LIKE '%::%'`,
    {
      transaction,
      type: queryInterface.sequelize.QueryTypes.SELECT,
    },
  );
  console.log(`adding ${missingGenes.length} genes`);
  await queryInterface.bulkInsert(
    GENE_TABLE,
    missingGenes.map((rec) => {
      return {...rec, ident: uuidv4()};
    }),
    {transaction},
  );

  console.log('copy missing fusion-related genes');
  for (const part of [1, 2]) {
    const genes = await queryInterface.sequelize.query(
      `SELECT * FROM (
        SELECT DISTINCT ON (report_id, name) report_id,
          split_part(gene, '::', :part) AS name,
          created_at,
          updated_at
        FROM ${KB_TABLE}
        WHERE gene LIKE '%::%'
      ) kb
      WHERE NOT EXISTS (
        SELECT *
        FROM ${GENE_TABLE} gene
        WHERE gene.name = kb.name AND gene.report_id = kb.report_id
      ) AND kb.name NOT IN ('None', '', 'NA', 'na', '?')`,
      {
        transaction,
        replacements: {part},
        type: queryInterface.sequelize.QueryTypes.SELECT,
      },
    );
    console.log(`adding ${genes.length} genes`);
    await queryInterface.bulkInsert(
      GENE_TABLE,
      genes.map((rec) => {
        return {...rec, ident: uuidv4()};
      }),
      {transaction},
    );
  }
};

module.exports = {
  up: async (queryInterface, Sq) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await transferKbGeneData(queryInterface, Sq, transaction);
      await transferKbSmallMutationData(queryInterface, Sq, transaction);
      await transferKbExpressionData(queryInterface, Sq, transaction);
      await transferKbCopyData(queryInterface, Sq, transaction);
      await transferKbStructuralVariantData(queryInterface, Sq, transaction);
      await transaction.commit();
    } catch (e) {
      // console.error(e);
      await transaction.rollback();
      throw e;
    }
  },

  down: () => {
    throw Error('not implemented');
  },
};
