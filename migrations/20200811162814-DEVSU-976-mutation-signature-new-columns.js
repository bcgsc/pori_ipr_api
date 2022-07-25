const TABLE = 'reports_somatic_mutations_mutation_signature';
const SOURCE_TABLE = 'reports_summary_tumour_analysis';

module.exports = {
  up: (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // add new columns
      await queryInterface.addColumn(TABLE, 'kb_category', {type: Sq.TEXT, defaultValue: null}, {transaction});
      await queryInterface.addColumn(TABLE, 'selected', {type: Sq.BOOLEAN, defaultValue: false}, {transaction});

      // rename snake case columns
      await queryInterface.renameColumn(TABLE, 'numCancerTypes', 'num_cancer_types', {transaction});
      await queryInterface.renameColumn(TABLE, 'cancerTypes', 'cancer_types', {transaction});

      const tempView = 'selected_signatures';
      // create the signatures view
      console.log('create the signatures view');
      await queryInterface.sequelize.query(
        `CREATE TEMP VIEW ${tempView} AS SELECT spec.report_id,
          spec.signature,
          spec.modifier as kb_category,
          spec."createdAt" AS created_at,
          spec."updatedAt" AS updated_at,
          spec."deletedAt" AS deleted_at,
          sig.nnls,
          sig.pearson,
          sig.associations,
          sig.features,
          sig.num_cancer_types,
          sig.cancer_types,
          sig.ident,
          TRUE as selected
        FROM (SELECT * FROM ${SOURCE_TABLE},
          jsonb_to_recordset(${SOURCE_TABLE}."mutationSignature") AS spec(
            "signature" text,
            "modifier" text,
            "createdAt" timestamp with time zone,
            "updatedAt" timestamp with time zone,
            "deletedAt" timestamp with time zone
          )) spec JOIN ${TABLE} sig USING (report_id, signature)
        WHERE spec.deleted_at IS NULL`,
        {transaction},
      );
      console.log('soft-delete selected signatures');
      // make the selected signatures entries as deleted
      await queryInterface.sequelize.query(
        `UPDATE ${TABLE} AS sig
        SET deleted_at = ss.updated_at
        FROM ${tempView} ss
        WHERE ss.signature = sig.signature AND ss.report_id = sig.report_id`,
        {transaction},
      );

      console.log('create the new signatures records');
      // copy data from JSONb column on tumour analysis table to create the new selected rows
      await queryInterface.sequelize.query(
        `INSERT INTO ${TABLE}(
          signature,
          kb_category,
          created_at,
          updated_at,
          deleted_at,
          nnls,
          pearson,
          associations,
          features,
          num_cancer_types,
          cancer_types,
          ident,
          selected,
          report_id
        ) SELECT signature,
          kb_category,
          created_at,
          updated_at,
          deleted_at,
          nnls,
          pearson,
          associations,
          features,
          num_cancer_types,
          cancer_types,
          ident,
          selected,
          report_id
        FROM ${tempView}`,
        {transaction},
      );
      // drop the view and source column
      await queryInterface.sequelize.query(`ALTER TABLE ${SOURCE_TABLE} DROP COLUMN "mutationSignature" CASCADE`, {transaction});
      // rename table to simplify
      await queryInterface.renameTable(TABLE, 'reports_mutation_signature', {transaction});
    });
  },

  down: () => {
    throw new Error('Not implemented!');
  },
};
