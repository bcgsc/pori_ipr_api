const {v4: uuidv4} = require('uuid');

module.exports = {
  up: async (queryInterface, Sq) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const reports = await queryInterface.sequelize.query(
        `
          SELECT id, seq_qc
          FROM reports
          WHERE seq_qc IS NOT NULL;
        `,
        {
          type: queryInterface.sequelize.QueryTypes.SELECT,
          transaction,
        },
      );

      const now = new Date();
      const rows = [];

      for (const report of reports) {
        for (const seqQCItem of report.seq_qc) {
          rows.push({
            ident: uuidv4(),
            created_at: now,
            updated_at: now,
            report_id: report.id,
            reads: seqQCItem.Reads,
            bio_qc: seqQCItem.bioQC,
            lab_qc: seqQCItem.labQC,
            sample: seqQCItem.Sample,
            library: seqQCItem.Library,
            coverage: seqQCItem.Coverage,
            input_ng: seqQCItem.Input_ng,
            input_ug: seqQCItem.Input_ug,
            protocol: seqQCItem.Protocol,
            sample_name: seqQCItem['Sample Name'],
            duplicate_reads_perc: seqQCItem.Duplicate_Reads_Perc,
          });
        }
      }

      if (rows.length !== 0) {
        await queryInterface.bulkInsert('reports_seqqc', rows, {transaction});
      }

      await queryInterface.removeColumn('reports', 'seq_qc', {transaction});
    });
  },

  down: async (queryInterface, Sq) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('reports', 'seq_qc', {
        type: Sq.JSONB,
        defaultValue: null,
      }, {transaction});

      await queryInterface.sequelize.query(`
        WITH restored_seq_qc AS (
          SELECT
            report_id,
            jsonb_agg(jsonb_build_object(
              'Reads', reads,
              'bioQC', bio_qc,
              'labQC', lab_qc,
              'Sample', sample,
              'Library', library,
              'Coverage', coverage,
              'Input_ng', input_ng,
              'Input_ug', input_ug,
              'Protocol', protocol,
              'Sample Name', sample_name,
              'Duplicate_Reads_Perc', duplicate_reads_perc
            )) AS seq_qc
          FROM reports_seqqc
          GROUP BY report_id
        )
        UPDATE reports r
        SET seq_qc = restored_seq_qc.seq_qc
        FROM restored_seq_qc
        WHERE r.id = restored_seq_qc.report_id;
      `, {transaction});

      await queryInterface.sequelize.query(`
        DELETE FROM reports_seqqc rs
        USING reports r
        WHERE rs.report_id = r.id
          AND r.seq_qc IS NOT NULL;
      `, {transaction});
    });
  },
};
