const GERMLINE_VARIANT_TABLE = 'germline_small_mutations_variant';
const DB_SNP = 'db_snp';
const DB_SNP_IDS = 'db_snp_ids';
const CLINVAR_IDS = 'clinvar_ids';
const COSMIC_IDS = 'cosmic_ids';

module.exports = {
  up: (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // Add new columns
      await Promise.all([
        queryInterface.addColumn(GERMLINE_VARIANT_TABLE, DB_SNP_IDS, {type: Sq.TEXT}, {transaction}),
        queryInterface.addColumn(GERMLINE_VARIANT_TABLE, CLINVAR_IDS, {type: Sq.TEXT}, {transaction}),
        queryInterface.addColumn(GERMLINE_VARIANT_TABLE, COSMIC_IDS, {type: Sq.TEXT}, {transaction}),
      ]);

      // Create temporary function to parse db_snp data
      await queryInterface.sequelize.query(
        `
          CREATE FUNCTION split_db_snp(db_snp text, col text)
          RETURNS TEXT AS $$
          DECLARE 
            val TEXT;
            snp_arr text[] := string_to_array(db_snp, ';');
            temp_val text := null;
          BEGIN
            IF snp_arr IS NULL THEN
              return NULL;
            ELSE
              FOREACH val IN array snp_arr LOOP
                IF val like 'rs%' AND col = 'db_snp_ids' THEN
                  IF temp_val IS NULL THEN
                    temp_val := val;
                  ELSE
                    temp_val := temp_val || ';' || val;
                  END IF;
                ELSIF val like 'COS%' AND col = 'cosmic_ids' THEN
                  IF temp_val IS NULL THEN
                    temp_val := val;
                  ELSE
                    temp_val := temp_val || ';' || val;
                  END IF;
                ELSIF val ~ '^[0-9]*$' AND col = 'clinvar_ids' THEN
                  IF temp_val IS NULL THEN
                    temp_val := val;
                  ELSE
                    temp_val := temp_val || ';' || val;
                  END IF;
                END IF;
              END LOOP;
              return temp_val;
            END IF;
          END;
          $$  LANGUAGE plpgsql
        `,
        {transaction},
      );

      // Move parsed db_snp data to new columns
      await queryInterface.sequelize.query(
        `
          UPDATE ${GERMLINE_VARIANT_TABLE} 
          SET ${DB_SNP_IDS} = split_db_snp(${DB_SNP}, '${DB_SNP_IDS}'), 
            ${CLINVAR_IDS} = split_db_snp(${DB_SNP}, '${CLINVAR_IDS}'), 
            ${COSMIC_IDS} = split_db_snp(${DB_SNP}, '${COSMIC_IDS}');`,
        {transaction},
      );

      // Delete temporary function
      await queryInterface.sequelize.query(
        'DROP FUNCTION IF EXISTS split_db_snp(text, text);',
        {transaction},
      );

      // Delete old db_snp column
      return queryInterface.removeColumn(GERMLINE_VARIANT_TABLE, DB_SNP, {transaction});
    });
  },
  down: () => {
    throw new Error('Not Implemented!');
  },
};
