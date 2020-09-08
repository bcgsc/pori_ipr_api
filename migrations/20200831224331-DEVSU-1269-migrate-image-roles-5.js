const {addUniqueActiveFieldIndex} = require('../migrationTools');

const IMAGE_TABLE = 'reports_image_data';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // convert "none" and blanks to "average"

      // soft-delete extra coadread plots if there is another non-extra plot
      await queryInterface.sequelize.query(
        `UPDATE ${IMAGE_TABLE}
          SET deleted_at = NOW()
          WHERE deleted_at IS NULL
            AND (
              key ILIKE 'mutation_summary.%.coadread_read'
              OR key ILIKE 'mutation_summary.%.coadread_coad'
              OR key ILIKE 'mutation_summary.%.coad|read'
            ) AND EXISTS (
              SELECT *
              FROM ${IMAGE_TABLE} img
              WHERE img.report_id = report_id
                AND img.key ILIKE 'mutation_summary.%.coadread'
                AND img.deleted_at IS NULL
            )`,
        {transaction}
      );
      // clean up bad data
      const replacements = {
        'coad|read': 'coadread',
        coadread_coad: 'coadread',
        coadread_read: 'coadread',
        luad_non_smoker: 'luad_non-smoker',
        '*': 'average',
      };

      await Promise.all(Object.keys(replacements).map(
        async (key) => {
          return queryInterface.sequelize.query(
            `UPDATE ${IMAGE_TABLE}
            SET key = concat(substring(key from 0 for LENGTH(key) - LENGTH(:curr) + 1), :rep)
            WHERE substring(LOWER(key) from LENGTH(key) - LENGTH(:curr) + 1) = :curr
              AND deleted_at IS NULL
              AND key ILIKE 'mutation_summary.%'`,
            {transaction, replacements: {curr: key, rep: replacements[key]}}
          );
        }
      ));
      // try to link each row to a comparator in the comparator table
      const tempView = 'temp_images_to_comparators';
      await queryInterface.sequelize.query(
        `CREATE TEMP VIEW ${tempView} AS
        SELECT image.key AS image_key,
          substring(image.key from LENGTH(image.key) - LENGTH(name) + 1) AS image_suffix ,
          image.id AS image_id,
          comp.name AS comp_name,
          comp.id AS comp_id,
          comp.analysis_role AS comp_role,
          SPLIT_PART(SPLIT_PART(comp.analysis_role::TEXT, '(', 2), ')', 1) AS comp_role_type
        FROM ${IMAGE_TABLE} image
        LEFT JOIN reports_comparators comp ON (
          LOWER(comp.name) = substring(LOWER(image.key) from LENGTH(image.key) - LENGTH(name) + 1)
        )
        WHERE comp.deleted_at IS NULL
          AND image.deleted_at IS NULL
          AND image.report_id = comp.report_id
          AND comp.analysis_role::TEXT ILIKE 'mutation burden (%)'`,
        {transaction}
      );

      // throw error if any images were not able to be mapped
      const result = await queryInterface.sequelize.query(
        `SELECT * FROM ${tempView} WHERE comp_role IS NULL`,
        {transaction, type: queryInterface.sequelize.QueryTypes.SELECT}
      );
      if (result.length) {
        throw new Error('some records cannot be linked automatically and require manual resolution');
      }
      // rename the image keys to use the role
      await queryInterface.sequelize.query(
        `UPDATE ${IMAGE_TABLE} i SET key = REPLACE(i.key, t.image_suffix, t.comp_role_type)
        FROM ${tempView} t
        WHERE i.id = t.image_id and i.deleted_at IS NULL`,
        {transaction}
      );

      // rename the key prefix
      await queryInterface.sequelize.query(
        `UPDATE ${IMAGE_TABLE} SET key = REPLACE(key, 'mutation_summary', 'mutationBurden')
        WHERE deleted_at IS NULL AND key ILIKE 'mutation_summary.%'`,
        {transaction}
      );

      // add image key unique constraint so that the user cannot use the same
      // image key twice in a report
      await addUniqueActiveFieldIndex(
        queryInterface, Sequelize, transaction, IMAGE_TABLE, ['report_id', 'key']
      );
      await queryInterface.sequelize.query(
        `DROP VIEW ${tempView}`,
        {transaction}
      );
    });
  },

  down: () => {
    throw new Error('Not implemented!');
  },
};
