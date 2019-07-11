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
        'pog_id',
        'createdAt',
        'updatedAt',
        'deletedAt',
      ],
    },
  };

  const results = await db.models.genomicAlterationsIdentified.findAll(opts);

  const filename = `${directory.export}/genomic_alt_identified.csv`;
  // Construct data
  let data = 'gene_variant_1,gene_variant_2,gene_variant_3,gene_variant_4,gene_variant_5\n';
  // Add variants to data string
  while (results.length > 0) {
    data += `${results.splice(0, 5).map(value => value.get().geneVariant).join(',')}\n`;
  }

  unlinkAndWrite(filename, data);

  return {stage: 'summary.genomicAlterationsIdentified', status: true};
};
