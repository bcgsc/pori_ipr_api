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
        'tumourSample',
        'tumourProtocol',
        'constitutionalSample',
        'constitutionalProtocol',
        'createdAt',
        'updatedAt',
        'deletedAt',
      ],
    },
    limit: 1,
  };

  const result = await db.models.patientInformation.findOne(opts);
  const preMapped = [result.get()];

  // Reverse Remap keys
  const mapped = reverseMapKeys(preMapped, nconf.get('summary:patientInformation'));
  const data = new WriteCSV(mapped).raw();

  const filename = `${directory.export}/patient_info.csv`;
  unlinkAndWrite(filename, data);

  return {stage: 'summary.patientInformation', status: true};
};
