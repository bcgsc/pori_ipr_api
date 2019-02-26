
const dl = require('datalib');
const db = require('../../models');

const {logger} = process;

const remapStatus = (inputStatus) => {
  if (!inputStatus) {
    return 'REQUIRES-REVIEW';
  }
  if (inputStatus.match(/(v[0-9]*.[0-9]*.[0-9]*)/)) {
    return 'APPROVED';
  }
  return inputStatus;
};

const mapUser = (inputUser) => {
  switch (inputUser) {
    case 'CRR':
      return 4;
    case 'MRJ':
      return 3;
    default:
      return null;
  }
};


/**
 * Parse KB Entries file
 *
 * @param {string} dir - Directory to locate the KB exports in
 * @param {object} options - Contains the events filename
 *
 * @returns {Promise.<object>} - Resolves with object, Rejects with object
 */
module.exports = async (dir, options) => {
  const file = options.events;

  if (!file) {
    throw new Error('No events filename specified');
  }

  // Read in event entries
  const entries = dl.tsv(`${dir}/${file}`);
  entries.forEach((entry, index) => {
    // Ignore deleted entries.
    if (entry.status === 'RESOLVED-CAN-DELETE') {
      return delete entries[index];
    }
    // Do some remapping
    entry.in_version = (entry.status && entry.status.match(/(v[0-9]*.[0-9]*.[0-9]*)/)) ? entry.status : null;
    entry.status = remapStatus(entry.status);
    entry.reviewedBy_id = mapUser(entry.last_modified_by);
  });

  // Add to Database
  const result = await db.models.kb_event.bulkCreate(entries);
  logger.info('Finished loading KB events table.');

  return result;
};
