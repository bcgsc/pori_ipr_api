const nconf = require('nconf').argv().env().file({file: './config/config.json'});

const db = require('../../models');
const reverseMapKeys = require('../../libs/reverseMapKeys');
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
        'newEntry',
        'approvedTherapy',
        'createdAt',
        'updatedAt',
        'deletedAt',
        'kb_newEntry',
      ],
    },
    order: [['gene', 'ASC']],
  };

  // Get First Table
  const results = await db.models.alterations.findAll(opts);
  const preMapped = results.map(value => value.get());

  // Reverse Remap keys
  const mapped = reverseMapKeys(preMapped, nconf.get('detailedGenomicAnalysis:alterations'));

  const processAlteration = (alt) => {
    delete alt.alterationType;
    return alt;
  };

  // Sort into types
  const alterations = {
    clin_rel_known_alt_detailed: [], // Therapeutic
    clin_rel_known_biol_detailed: [], // Biological
    clin_rel_known_diag_detailed: [], // Diagnostic
    clin_rel_known_prog_detailed: [], // Prognostic
    clin_rel_unknown_alt_detailed: [], // Unknown/Uncharacterized
  };

  // loop over and drop into categories
  mapped.forEach((a) => { //  {therapeutic,prognostic,diagnostic,biological,unknown}
    switch (a.alterationType) {
      case 'therapeutic':
        alterations.clin_rel_known_alt_detailed.push(processAlteration(a));
        break;
      case 'biological':
        alterations.clin_rel_known_biol_detailed.push(processAlteration(a));
        break;
      case 'diagnostic':
        alterations.clin_rel_known_diag_detailed.push(processAlteration(a));
        break;
      case 'prognostic':
        alterations.clin_rel_known_prog_detailed.push(processAlteration(a));
        break;
      case 'unknown':
        alterations.clin_rel_unknown_alt_detailed.push(processAlteration(a));
        break;
      default:
        throw new Error('Document does not belong to a category.');
    }
  });

  const writeFiles = (filename, group) => {
    return Promise.all([
      async () => unlinkAndWrite(
        `${directory.export}/${filename}.csv`,
        new WriteCSV(group, ['kb_data']).raw()
      ),
      async () => unlinkAndWrite(
        `${directory.export}/${filename.replace('_detailed', '')}.csv`,
        new WriteCSV(group, ['KB_event_key', 'KB_ENTRY_key']).raw()
      ),
    ]);
  };

  const promises = [];
  // iterate over all groups and their files and add them
  // to an array to be written concurrently
  Object.entries(alterations).forEach(([filename, group]) => {
    promises.push(
      writeFiles(filename, group),
    );
  });

  await Promise.all(promises);
  return {stage: 'detailedGenomicAnalysis.alterations', status: true};
};
