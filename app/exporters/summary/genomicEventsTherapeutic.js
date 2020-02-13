const nconf = require('nconf').argv().env().file({file: './config/columnMaps.json'});
const db = require('../../../app/models');
const reverseMapKeys = require('../../../app/libs/reverseMapKeys');
const WriteCSV = require('../../../lib/writeCSV');
const {unlinkAndWrite} = require('../utils');

module.exports = async (report, directory) => {
  const opts = {
    where: {
      report_id: report.id,
    },
    attributes: {
      exclude: [
        'id',
        'ident',
        'report_id',
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
