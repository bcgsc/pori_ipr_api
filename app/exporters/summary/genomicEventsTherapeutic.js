const nconf = require('nconf').argv().env().file({file: './config/columnMaps.json'});
const db = require('../../../app/models');
const reverseMapKeys = require('../../../app/libs/reverseMapKeys');
const WriteCSV = require('../../../lib/writeCSV');
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

  const results = await db.models.genomicEventsTherapeutic.findAll(opts);
  const preMapped = results.map(value => value.get());

  const filename = `${directory.export}/genomic_events_thera_assoc.csv`;

  // Reverse Remap keys
  const mapped = reverseMapKeys(preMapped, nconf.get('summary:genomicEventsTherapeutic'));
  const data = new WriteCSV(mapped).raw();
  unlinkAndWrite(filename, data);

  return {stage: 'summary.genomicEventsTherapeutic', status: true};
};
