const db = require('../../../app/models');
const {unlinkAndWrite} = require('../utils');

module.exports = async (pog, directory) => {
  const opts = {
    where: {
      pog_id: pog.id,
    },
    attributes: {
      exclude: [
        'id',
        'ident',
        'dataVersion',
        'pog_id',
        'createdAt',
        'updatedAt',
        'deletedAt',
      ],
    },
  };

  const results = await db.models.genomicAlterationsIdentified.findAll(opts);

  const entries = [];
  // Extract raw values into preMapped
  results.forEach((value) => {
    entries.push(value.get().geneVariant);
  });

  const filename = `${directory.export}/genomic_alt_identified.csv`;
  // Construct data
  let data = 'gene_variant_1,gene_variant_2,gene_variant_3,gene_variant_4,gene_variant_5\n';
  while (entries.length > 0) {
    data += `${entries.splice(0, 5).join(',')}\n`;
  }
  unlinkAndWrite(filename, data);

  return {stage: 'summary.genomicAlterationsIdentified', status: true};
};
