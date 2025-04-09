const {addUniqueActiveFieldIndex} = require('../../migrationTools');

const IMAGE_TABLE = 'reports_image_data';
const COMPARATORS_TABLE = 'reports_comparators';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // lowercase all the names
      console.log('lowercase all mutation burden image keys');
      await queryInterface.sequelize.query(
        `UPDATE ${IMAGE_TABLE}
          SET key = LOWER(key)
          WHERE deleted_at IS NULL
            AND key like 'mutation_summary.%'`,
        {transaction},
      );
      // convert old naming schemes
      const replacements = [
        {pattern: 'mutation_summary.%', oldText: 'mutation_summary.', newText: 'mutationBurden.'},
        {pattern: 'mutationBurden.density_plot%', oldText: 'density_plot', newText: 'density'},
        {pattern: 'mutationBurden.bar_indel', oldText: '.bar_indel', newText: '.barplot_indel.average'},
        {pattern: 'mutationBurden.bar_snv', oldText: '.bar_snv', newText: '.barplot_snv.average'},
        {pattern: 'mutationBurden.bar_sv', oldText: '.bar_sv', newText: '.barplot_sv.average'},
        {pattern: 'mutationBurden.%coad|read', oldText: 'coad|read', newText: 'coadread'},
        {pattern: 'mutationBurden.%coadread_coad', oldText: 'coadread_coad', newText: 'coadread'},
        {pattern: 'mutationBurden.%coadread_read', oldText: 'coadread_read', newText: 'coadread'},
        {pattern: 'mutationBurden.%.luad_non_smoker', oldText: 'luad_non_smoker', newText: 'luad_non-smoker'},
        {pattern: 'mutationBurden.%.\\*', oldText: '.*', newText: '.average'},
        {pattern: 'mutsummary.barsv', oldText: 'mutsummary.barsv', newText: 'mutationBurden.barplot_sv.average'},
        {pattern: 'mutsummary.barindel', oldText: 'mutsummary.barindel', newText: 'mutationBurden.barplot_indel.average'},
        {pattern: 'mutsummary.barsnv', oldText: 'mutsummary.barsnv', newText: 'mutationBurden.barplot_snv.average'},
        {pattern: 'mutationBurden.%.none', oldText: '.none', newText: '.average'},
        {pattern: 'mutationBurden.%_sv', oldText: '_sv', newText: '_sv.average'},
        {pattern: 'mutationBurden.%_snv', oldText: '_snv', newText: '_snv.average'},
        {pattern: 'mutationBurden.%_indel', oldText: '_indel', newText: '_indel.average'},
        {pattern: 'mutationBurden.legend', oldText: '.legend', newText: '.legend_snv_indel.average'},
        {pattern: 'mutationBurden.legend.%', oldText: '.legend.', newText: '.legend_snv_indel.'},
        // visually inspected these to confirm they are density and not bar plots
        {pattern: 'mutationBurden.indel', oldText: '.indel', newText: '.density_indel.average'},
        {pattern: 'mutationBurden.snv', oldText: '.snv', newText: '.density_snv.average'},
        {pattern: 'mutationBurden.sv', oldText: '.sv', newText: '.density_sv.average'},
      ];

      for (const {pattern, oldText, newText} of replacements) {
        console.log(`executing replacement of ${oldText} with ${newText} for ${pattern}`);
        await queryInterface.sequelize.query(
          `UPDATE ${IMAGE_TABLE}
            SET key = REPLACE(key, :oldText, :newText)
            WHERE deleted_at IS NULL
              AND (
                key ILIKE '${pattern}'
              );`,
          {transaction, replacements: {oldText, newText}},
        );
      }

      // soft-delete duplicate keys, keep newest
      const softDeleted = await queryInterface.sequelize.query(
        `UPDATE ${IMAGE_TABLE} curr
          SET deleted_at = NOW()
          WHERE curr.deleted_at IS NULL
            AND NOT EXISTS (
              SELECT * FROM (
                SELECT DISTINCT ON (img.report_id, img.key) img.report_id,
                    img.key,
                    img.updated_at,
                    img.id
                  FROM ${IMAGE_TABLE} img
                  WHERE img.deleted_at IS NULL
                  ORDER BY img.report_id, img.key, img.updated_at, img.id DESC
              ) foo WHERE foo.id = curr.id
            )`,
        {transaction},
      );
      console.log(`soft-deleted ${softDeleted.length} duplicate images`);

      // try to link each row to a comparator in the comparator table
      const tempView = 'temp_images_to_comparators';
      await queryInterface.sequelize.query(
        `CREATE TEMP VIEW ${tempView} AS
        SELECT image.*,
          comp.comp_role,
          comp.comp_role_type,
          comp.comp_name
        FROM (
          SELECT SPLIT_PART(key, '.', 3) as image_comp,
            SPLIT_PART(key, '.', 2) as image_type,
            key as image_key,
            id as image_id,
            report_id
          FROM ${IMAGE_TABLE}
          WHERE deleted_at IS NULL
            AND key ILIKE 'mutationBurden.%'
        ) image
        LEFT JOIN (
          SELECT DISTINCT analysis_role AS comp_role,
            SPLIT_PART(SPLIT_PART(analysis_role::TEXT, '(', 2), ')', 1) AS comp_role_type,
            name as comp_name,
            report_id
          FROM ${COMPARATORS_TABLE}
          WHERE analysis_role::TEXT ILIKE 'mutation burden (%)'
            AND deleted_at IS NULL
        ) comp ON (
          LOWER(comp.comp_name) = image.image_comp
          AND comp.report_id = image.report_id
        )
        `,
        {transaction},
      );

      // insert missing report comparator roles for non-average comparators
      const insertMissingComparators = async ({roleName, average = false}) => {
        try {
          // insert a new comparator if one with this role does not already exist
          const newComparators = await queryInterface.sequelize.query(
            `INSERT INTO ${COMPARATORS_TABLE} (
              report_id, name, ident, created_at, updated_at, analysis_role
            )
            SELECT * FROM (
              SELECT DISTINCT ON (img.report_id, tv.image_comp) img.report_id as report_id,
                tv.image_comp as name,
                uuid_generate_v4() as ident,
                img.created_at as created_at,
                img.updated_at as updated_at,
                :roleName::enum_reports_comparators_analysis_role as analysis_role
              FROM ${tempView} tv
              JOIN ${IMAGE_TABLE} img ON (
                tv.image_id = img.id
              )
              WHERE tv.comp_role IS NULL
                AND tv.image_comp ${average ? '= \'average\'' : '!= \'average\''}
                AND NOT EXISTS (
                  SELECT * FROM ${COMPARATORS_TABLE} comp
                  WHERE comp.report_id = tv.report_id
                    AND comp.analysis_role = :roleName::enum_reports_comparators_analysis_role
                    AND comp.deleted_at IS NULL
                )
              ORDER BY img.report_id, tv.image_comp, img.updated_at DESC
            ) foo
          `,
            {transaction, replacements: {roleName}},
          );
          console.log(`created ${newComparators.length} new image comparator entries`);
        } catch (err) {
          console.error(err.errors || err);
          throw err;
        }
      };
      // prefer the non-average comparator for the primary when both it and average are present
      await insertMissingComparators({roleName: 'mutation burden (primary)', average: false});
      await insertMissingComparators({roleName: 'mutation burden (primary)', average: true});
      await insertMissingComparators({roleName: 'mutation burden (secondary)', average: false});
      await insertMissingComparators({roleName: 'mutation burden (secondary)', average: true});

      // throw error if any images were not able to be mapped
      const missingMappings = await queryInterface.sequelize.query(
        `SELECT * FROM ${tempView} WHERE comp_role IS NULL or image_comp IS NULL`,
        {transaction, type: queryInterface.sequelize.QueryTypes.SELECT},
      );
      if (missingMappings.length) {
        console.log(missingMappings);
        throw new Error(`some records (${missingMappings.length}) cannot be linked automatically and require manual resolution`);
      }
      // throw error if duplicate mappings are created
      const duplicateMappings = await queryInterface.sequelize.query(
        `SELECT curr.report_id, curr.comp_role_type, curr.image_type, array_agg(curr.image_key) as keys, array_agg(curr.image_id) as images FROM ${tempView} curr WHERE EXISTS (
          SELECT * FROM ${tempView} other
          WHERE other.image_id != curr.image_id
            AND other.report_id = curr.report_id
            AND other.comp_role_type = curr.comp_role_type
            AND other.image_type = curr.image_type
        ) GROUP BY curr.report_id, curr.comp_role_type, curr.image_type`,
        {transaction, type: queryInterface.sequelize.QueryTypes.SELECT},
      );
      if (duplicateMappings.length) {
        console.log(duplicateMappings);
        throw new Error('Duplicate mappings were observed');
      }

      // rename the image keys to use the role
      console.log('rename image keys to use the role instead of the literal cohort name');
      await queryInterface.sequelize.query(
        `UPDATE ${IMAGE_TABLE} img SET key = REPLACE(img.key, tempview.image_comp, tempview.comp_role_type)
        FROM ${tempView} tempview
        WHERE img.id = tempview.image_id and img.deleted_at IS NULL`,
        {transaction},
      );
      // check that no image keys were missed
      const failedRenames = await queryInterface.sequelize.query(
        `SELECT img.report_id, img.id, img.key, tv.*
        FROM ${IMAGE_TABLE} img
        LEFT JOIN ${tempView} tv ON (img.id = tv.image_id)
        WHERE img.deleted_at IS NULL
          AND img.key ILIKE 'mutationBurden.%'
          AND NOT (
            img.key ILIKE '%.primary'
            OR img.key ILIKE '%.secondary'
            OR img.key ILIKE '%.tertiary'
            OR img.key ILIKE '%.quaternary'
          )
        `,
        {transaction, type: queryInterface.sequelize.QueryTypes.SELECT},
      );

      if (failedRenames.length) {
        console.error(failedRenames);
        throw new Error(`failed to rename ${failedRenames.length} mutation burden image keys`);
      }

      await queryInterface.sequelize.query(
        `DROP VIEW ${tempView}`,
        {transaction},
      );

      // add image key unique constraint so that the user cannot use the same
      // image key twice in a report
      try {
        await addUniqueActiveFieldIndex(queryInterface, Sequelize, transaction, IMAGE_TABLE, ['report_id', 'key']);
      } catch (err) {
        console.error(err);
        throw err;
      }
    });
  },

  down: () => {
    throw new Error('Not implemented!');
  },
};
