/**
 * Replace the gene column with use of the gene FK
 */
const uuidv4 = require('uuid/v4');

const GENE_TABLE = 'reports_genes';
const SV_TABLE = 'pog_analysis_reports_structural_variation_sv';
const EXPRESSION_TABLE = 'pog_analysis_reports_expression_outlier';
const EXPRESSION_DRUG_TARGET_TABLE = 'pog_analysis_reports_expression_drug_target';
const MUTATIONS_TABLE = 'pog_analysis_reports_somatic_mutations_small_mutations';
const COPY_VARIANTS_TABLE = 'pog_analysis_reports_copy_number_analysis_cnv';

const addIdent = (rec) => {
  return {...rec, ident: uuidv4()};
};

const GENE_VARIANT_TABLES = [EXPRESSION_TABLE, COPY_VARIANTS_TABLE, MUTATIONS_TABLE, EXPRESSION_DRUG_TARGET_TABLE];

module.exports = {
  up: async (queryInterface, Sq) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('Copy the genes from each variant to the genes table');

      // copy number: (cnvVariant) lowlyExpTSloss, highlyExpOncoGain,  homodTumourSupress, commonAmplified
      // expression: (outlierType)  downreg_tsg, upreg_onco

      for (const table of GENE_VARIANT_TABLES) {
        console.log(`copy genes from ${table}`);
        const records = await queryInterface.sequelize.query(
          `SELECT DISTINCT ON (report_id, name) report_id,
            gene as name,
            created_at,
            updated_at
          FROM ${table} mut
          WHERE NOT EXISTS (
            SELECT * FROM ${GENE_TABLE} gene
            WHERE gene.deleted_at IS NULL AND mut.report_id = gene.report_id AND mut.gene = gene.name
          )
          ORDER BY report_id, name, deleted_at DESC, updated_at DESC, created_at DESC`,
          {transaction, type: queryInterface.sequelize.QueryTypes.SELECT}
        );
        console.log(`copying ${records.length} records from ${table} to ${GENE_TABLE}`);
        await queryInterface.bulkInsert(
          GENE_TABLE,
          records.map(addIdent),
          {transaction}
        );
      }

      for (const geneCol of ['gene1', 'gene2']) {
        console.log(`copy genes from ${SV_TABLE}.${geneCol}`);
        const records = await queryInterface.sequelize.query(
          `SELECT DISTINCT ON (report_id, name) report_id,
              ${geneCol} as name,
              created_at,
              updated_at,
              deleted_at
            FROM ${SV_TABLE} mut
            WHERE NOT EXISTS (
              SELECT * FROM ${GENE_TABLE} gene
              WHERE gene.deleted_at IS NULL AND mut.report_id = gene.report_id AND mut.${geneCol} = gene.name
            )
            ORDER BY report_id, ${geneCol}, deleted_at DESC, updated_at DESC, created_at DESC`,
          {transaction, type: queryInterface.sequelize.QueryTypes.SELECT}
        );
        console.log(`copying ${records.length} records from ${SV_TABLE}.${geneCol} to ${GENE_TABLE}`);
        await queryInterface.bulkInsert(
          GENE_TABLE,
          records.map(addIdent),
          {transaction}
        );
      }

      // now that all the genes have been created. Add the FKs to each variant table
      for (const table of GENE_VARIANT_TABLES) {
        console.log(`Add value for gene_id FK to ${table}`);
        await queryInterface.sequelize.query(
          `UPDATE ${table} mut set gene_id = gene.id
          FROM (SELECT * FROM ${GENE_TABLE} WHERE deleted_at IS NULL) gene
          WHERE gene.report_id = mut.report_id AND gene.name = mut.gene`,
          {transaction}
        );
      }

      for (const col of ['gene1', 'gene2']) {
        console.log(`Add value for gene_id FK to ${SV_TABLE}.${col}`);
        await queryInterface.sequelize.query(
          `UPDATE ${SV_TABLE} mut set ${col}_id = gene.id
          FROM (SELECT * FROM ${GENE_TABLE} WHERE deleted_at IS NULL) gene
          WHERE gene.report_id = mut.report_id AND gene.name = mut.${col}`,
          {transaction}
        );
      }
      // add FK not null constraint
      for (const table of GENE_VARIANT_TABLES) {
        console.log(`Set not NULL on ${table}.gene_id`);
        // Add not null constraint to tables
        await queryInterface.changeColumn(
          table,
          'gene_id',
          {type: Sq.INTEGER, allowNull: false},
          {transaction}
        );
      }
      for (const table of GENE_VARIANT_TABLES) {
        console.log(`Dropping column ${table}.gene`);
        await queryInterface.removeColumn(
          table,
          'gene',
          {transaction}
        );
      }

      console.log('drop the gene1 and gene2 columns from SVs');
      await queryInterface.removeColumn(
        SV_TABLE,
        'gene1',
        {transaction}
      );
      await queryInterface.removeColumn(
        SV_TABLE,
        'gene2',
        {transaction}
      );

      // determine the annotations for each gene based on the sections their variant is in currently
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: () => {
    throw Error('Not Implemented');
  },
};
