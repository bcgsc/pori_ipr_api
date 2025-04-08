const PROBE_RESULTS_TABLE = 'reports_probe_results';
const GENOMIC_EVENTS_TABLE = 'reports_summary_genomic_events_therapeutic';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // add comments column to probe results table
      console.log(`creating the new column ${PROBE_RESULTS_TABLE}.comments`);
      await queryInterface.addColumn(PROBE_RESULTS_TABLE, 'comments', Sequelize.TEXT, {transaction});
      const tempViewName = 'temp_readable_events';
      // create temporary view with the split columns for the GENOMIC_EVENTS_TABLE table to simplify downstream queries
      console.log(`creating the simplifed view ${tempViewName}`);
      await queryInterface.sequelize.query(`
        CREATE TEMP VIEW ${tempViewName} AS SELECT
          DISTINCT ON (TRIM(gene_name), variant, report_id)
            TRIM(gene_name) AS gene_name,
            variant,
            report_id,
            comments,
            deleted_at,
            updated_at,
            created_at
          FROM (
            SELECT
              distinct report_id,
              comments,
              CASE
                  WHEN "genomicEvent" LIKE '%::%' OR "genomicEvent" NOT LIKE '%:%'
                      THEN split_part("genomicEvent", '(', 1)
                  ELSE split_part("genomicEvent", ':', 1)
              END AS gene_name,
              CASE
                  WHEN "genomicEvent" LIKE '%::%' OR "genomicEvent" NOT LIKE '%:%'
                      THEN split_part(split_part("genomicEvent", '(', 2), ')', 1)
                  ELSE split_part("genomicEvent", ':', 2)
              END AS variant,
              created_at,
              updated_at,
              deleted_at
            FROM
                ${GENOMIC_EVENTS_TABLE}
            WHERE
                "reportType" != 'genomic' AND deleted_at IS NULL
          ) foo
          ORDER BY TRIM(gene_name), variant, report_id, comments, updated_at DESC
      `, {transaction});
      console.log(`copying genes from ${GENOMIC_EVENTS_TABLE} to reports_genes`);
      // transfer missing genes from GENOMIC_EVENTS_TABLE to reports_genes
      await queryInterface.sequelize.query(`
        INSERT INTO reports_genes (name, report_id, ident, created_at, deleted_at, updated_at)
        SELECT DISTINCT ON (gene_name, report_id)
          gene_name as name,
          report_id,
          uuid_generate_v4(),
          created_at,
          deleted_at,
          updated_at
        FROM ${tempViewName} events
        WHERE NOT EXISTS (
          SELECT * FROM reports_genes genes
          WHERE genes.name = events.gene_name
            AND genes.report_id = events.report_id
        )
        ORDER BY gene_name, report_id, deleted_at DESC, updated_at, created_at
      `, {transaction});
      // transfer missing probes from GENOMIC_EVENTS_TABLE to reports_probe_results
      console.log(`copying probes from ${GENOMIC_EVENTS_TABLE} to ${PROBE_RESULTS_TABLE}`);
      await queryInterface.sequelize.query(`
        INSERT INTO ${PROBE_RESULTS_TABLE} (
          gene_id, report_id, variant, sample, ident, created_at, deleted_at, updated_at
        )
        SELECT DISTINCT ON (genes.id, report_id, variant)
          genes.id,
          genes.report_id,
          events.variant,
          '',
          uuid_generate_v4(),
          genes.created_at,
          genes.deleted_at,
          genes.updated_at
        FROM ${tempViewName} events
        JOIN reports_genes genes ON (
          genes.name = events.gene_name
          AND genes.report_id = events.report_id
        )
        WHERE NOT EXISTS (
          SELECT * FROM ${PROBE_RESULTS_TABLE} probes
          WHERE probes.gene_id = genes.id
            AND probes.report_id = events.report_id
            AND probes.variant = events.variant
        )
        ORDER BY genes.id,
          genes.report_id,
          events.variant,
          events.deleted_at DESC,
          genes.updated_at,
          genes.created_at
      `, {transaction});
      // transfer comments from GENOMIC_EVENTS_TABLE to reports_probe_results
      console.log(`copying comments from ${GENOMIC_EVENTS_TABLE} to ${PROBE_RESULTS_TABLE}`);
      await queryInterface.sequelize.query(`
      UPDATE ${PROBE_RESULTS_TABLE} probes SET comments = events.comments
      FROM ${tempViewName} events
      JOIN reports_genes genes ON (
        events.gene_name = genes.name
        AND events.report_id = genes.report_id
      )
      WHERE events.report_id = probes.report_id
        AND genes.id = probes.gene_id
        AND probes.variant = events.variant
    `, {transaction});

      // drop the temp table view that was created
      await queryInterface.sequelize.query(`DROP VIEW ${tempViewName}`, {transaction});

      // drop the GENOMIC_EVENTS_TABLE table
      await queryInterface.dropTable(GENOMIC_EVENTS_TABLE, {transaction});
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
