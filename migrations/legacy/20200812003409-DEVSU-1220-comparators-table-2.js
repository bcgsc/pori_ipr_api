const NEW_TABLE = 'reports_comparators';
const BURDEN_TABLE = 'reports_mutation_burden';
const EXPRESSION_TABLE = 'reports_expression_variants';
const ANALYSIS_TABLE = 'reports_summary_tumour_analysis';

const {addUniqueActiveFieldIndex} = require('../../migrationTools');

const migrateComparator = async (queryInterface, transaction, replacements, clause = '') => {
  return queryInterface.sequelize.query(
    `INSERT INTO ${NEW_TABLE}(
      ident,
      created_at,
      updated_at,
      report_id,
      analysis_role,
      name
    )
    SELECT DISTINCT ON (report_id, comparator) uuid_generate_v4(),
      created_at,
      updated_at,
      report_id,
      :role::enum_reports_comparators_analysis_role,
      comparator
    FROM ${BURDEN_TABLE}
    WHERE deleted_at IS NULL
      AND report_id IN (:reportIds) ${clause}
    ORDER BY report_id, comparator, created_at, updated_at`,
    {
      transaction,
      replacements,
    },
  );
};

module.exports = {
  up: async (queryInterface, Sq) => {
    try {
      await queryInterface.sequelize.transaction(async (transaction) => {
        await addUniqueActiveFieldIndex(queryInterface, Sq, transaction, NEW_TABLE, ['ident']);
        await addUniqueActiveFieldIndex(queryInterface, Sq, transaction, NEW_TABLE, ['report_id', 'analysis_role']);

        await addUniqueActiveFieldIndex(queryInterface, Sq, transaction, BURDEN_TABLE, ['report_id', 'role']);

        // migrate comparators
        for (const [role, column, table] of [
          ['expression (primary site)', 'normalExpressionComparator', ANALYSIS_TABLE],
          ['expression (disease)', 'diseaseExpressionComparator', ANALYSIS_TABLE],
        ]) {
          console.log(`migrating ${table}.${column} as ${role}`);
          await queryInterface.sequelize.query(
            `INSERT INTO ${NEW_TABLE}(
              ident,
              created_at,
              updated_at,
              report_id,
              analysis_role,
              name
            )
            SELECT DISTINCT ON (report_id, "${column}") uuid_generate_v4(),
              created_at,
              updated_at,
              report_id,
              :role,
              "${column}"
            FROM ${table}
            WHERE deleted_at IS NULL
            ORDER BY report_id, "${column}", created_at, updated_at`,
            {transaction, replacements: {role}},
          );
        }

        // delete the weird coad comparators (these got merged)
        await queryInterface.sequelize.query(
          `DELETE FROM ${BURDEN_TABLE}
          WHERE comparator IS NULL
            OR comparator = :read
            OR comparator = :coad`,
          {
            transaction,
            replacements: {coad: 'COADREAD_COAD', read: 'COADREAD_READ'},
          },
        );

        // get the mutation burden comparators
        const reportComparators = await queryInterface.sequelize.query(
          `SELECT report_id, array_agg(comparator) AS comp
          FROM ${BURDEN_TABLE}
          WHERE deleted_at IS NULL
          GROUP BY report_id`,
          {transaction, type: queryInterface.sequelize.QueryTypes.SELECT},
        );

        // create view of non-duplicates
        const tempView = 'temp_unique_burden';
        await queryInterface.sequelize.query(
          `CREATE TEMP VIEW ${tempView} AS
          SELECT DISTINCT ON (
              report_id, comparator,
              snv, snv_truncating,
              indels, indels_frameshift,
              sv, sv_expressed
            ) id, report_id, comparator,
            snv, snv_truncating, snv_percentile,
            indels, indels_frameshift, indel_percentile,
            sv, sv_expressed, sv_percentile, created_at, updated_at, deleted_at
          FROM ${BURDEN_TABLE}
          WHERE deleted_at IS NULL
          ORDER BY report_id, comparator,
            snv, snv_truncating,
            indels, indels_frameshift,
            sv, sv_expressed, updated_at DESC`,
          {
            transaction,
          },
        );
        await queryInterface.sequelize.query(
          `DELETE FROM ${BURDEN_TABLE} b
          WHERE NOT EXISTS (
            SELECT * FROM ${tempView} t
            WHERE t.id = b.id
          )`,
          {
            transaction,
          },
        );

        const singlePrimary = [];
        const averageSecondary = [];
        const luads = [];

        for (let {comp, report_id: reportId} of reportComparators) {
          comp = Array.from(new Set(comp)).sort().filter((c) => {
            return c;
          });
          if (comp.length === 1) {
            singlePrimary.push(reportId);
          } else if (comp.length === 2 && comp.includes('average')) {
            averageSecondary.push(reportId);
          } else if (
            comp.length === 4
            && comp.includes('LUAD')
            && comp.includes('LUAD_Smoker')
            && comp.includes('LUAD_Non-smoker')
            && comp.includes('average')
          ) {
            luads.push(reportId);
          } else {
            throw Error(`not implemented for comparator combination (${comp.join(', ')})`);
          }
        }

        if (singlePrimary.length) {
          console.log(`setting roles for ${singlePrimary.length} reports with role (primary) for single comparator`);
          const [, newRows] = await migrateComparator(
            queryInterface,
            transaction,
            {
              reportIds: singlePrimary,
              role: 'mutation burden (primary)',
            },
          );
          console.log(`created ${newRows} rows`);
          await queryInterface.sequelize.query(
            `UPDATE ${BURDEN_TABLE}
          SET role = :role
          WHERE deleted_at IS NULL
            AND report_id IN (:reportIds)`,
            {
              replacements: {
                reportIds: singlePrimary,
                role: 'primary',
              },
              transaction,
            },
          );
        }

        if (averageSecondary.length) {
          console.log(`setting roles for ${averageSecondary.length} reports with role (primary) for non-average comparator`);
          const [, newRows] = await migrateComparator(
            queryInterface,
            transaction,
            {
              reportIds: averageSecondary,
              average: 'average',
              role: 'mutation burden (primary)',
            },
            'AND comparator != :average',
          );
          console.log(`created ${newRows} rows`);
          await queryInterface.sequelize.query(
            `UPDATE ${BURDEN_TABLE}
          SET role = :role
          WHERE deleted_at IS NULL
            AND report_id IN (:reportIds)
            AND comparator != :average`,
            {
              replacements: {
                reportIds: averageSecondary,
                role: 'primary',
                average: 'average',
              },
              transaction,
            },
          );
        }

        for (const [reportIds, role, comparator] of [
          [averageSecondary, 'secondary', 'average'],
          [luads, 'primary', 'LUAD'],
          [luads, 'secondary', 'LUAD_Smoker'],
          [luads, 'tertiary', 'LUAD_Non-smoker'],
          [luads, 'quaternary', 'average'],
        ]) {
          if (reportIds.length === 0) {
            continue;
          }
          console.log(`setting roles for ${reportIds.length} reports with role (${role}) for comparator (${comparator})`);
          const [, newRows] = await migrateComparator(
            queryInterface,
            transaction,
            {reportIds, role: `mutation burden (${role})`, comparator},
            'AND comparator = :comparator',
          );
          if (newRows !== reportIds.length) {
            throw new Error(`Did not create (${newRows}) the expected number of new rows (${reportIds.length})`);
          }
          await queryInterface.sequelize.query(
            `UPDATE ${BURDEN_TABLE}
            SET role = :role::enum_${BURDEN_TABLE}_role
            WHERE deleted_at IS NULL
              AND report_id = ANY(array[:reportIds])
              AND comparator = :comparator`,
            {
              replacements: {
                reportIds,
                role,
                comparator,
              },
              transaction,
            },
          );
        }
        await queryInterface.sequelize.query(`DROP VIEW ${tempView}`, {transaction});
        // migrate the comparators from the expression table
        await queryInterface.sequelize.query(
          `INSERT INTO ${NEW_TABLE}(
            report_id, name, created_at, updated_at, ident, analysis_role
          )
          SELECT DISTINCT ON (report_id, "tcgaQCCol")
            report_id, "tcgaQCCol", created_at, updated_at, uuid_generate_v4(), 'expression (disease QC)'
          FROM ${EXPRESSION_TABLE}
          WHERE deleted_at IS NULL
            AND "tcgaQCCol" IS NOT NULL
          ORDER BY report_id, "tcgaQCCol", updated_at, created_at DESC`,
          {transaction},
        );

        // drop the comparator columns from the variant tables
        for (const col of [
          'gtexComp', 'tcgaQCCol', 'tcgaPercCol', 'tcgaAvgQCCol',
        ]) {
          await queryInterface.removeColumn(EXPRESSION_TABLE, col, {transaction});
        }
        await queryInterface.removeColumn(BURDEN_TABLE, 'comparator', {transaction});

        // migrate tumour content, ploidy, and subtyping to the reports table
        await queryInterface.sequelize.query(
          `UPDATE reports rep
          SET tumour_content = ann."tumourContent",
            ploidy = ann.ploidy,
            subtyping = ann.subtyping
          FROM ${ANALYSIS_TABLE} ann
          WHERE rep.deleted_at IS NULL
            AND ann.report_id = rep.id
            AND ann.deleted_at IS NULL
          `,
          {transaction},
        );
        // drop the tumour analysis table
        await queryInterface.dropTable(ANALYSIS_TABLE, {transaction});
      });
    } catch (err) {
      console.log(err);
      throw err;
    }
  },

  down: () => {
    throw new Error('Not implemented!');
  },
};
