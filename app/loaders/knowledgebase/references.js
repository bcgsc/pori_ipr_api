const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const db = require('../../models');

const logger = require('../../../lib/log');

const mapUser = (inputUser) => {
  if (!inputUser) {
    return null;
  }

  if (inputUser.includes('+')) {
    inputUser = inputUser.split('+')[0].trim();
  }
  return inputUser;
};

/**
 * Parse KB Entries file
 *
 * @param {string} dir - Directory to locate the KB exports in
 * @param {object} options - Contains name of file
 *
 * @returns {Promise.<object>} - Returns the result of adding KB entries to db
 */
module.exports = async (dir, options) => {
  const file = options.references || '/knowledge_base_references.csv';

  // First parse in therapeutic
  const output = fs.readFileSync(`${dir}/${file}`);
  logger.info(`Reading in references from: ${dir}/${file}`);

  // Parse file!
  const entries = parse(output, {delimiter: ',', columns: true, relax_column_count: true});

  logger.info(`Entries to be processed: ${entries.length}`);

  entries.forEach((entry, index) => {
    // Ignore deleted entries.
    if (entry.status === 'RESOLVED-CAN-DELETE') {
      return delete entries[index];
    }

    // Do some remapping
    entry.reviewedBy_id = mapUser(entry.last_modified_by);
    if (!entry.status) {
      entry.status = 'REQUIRES-REVIEW';
    }
    entry.ref_id = entry.id; // Move id to ref_id;
    entry.type = (!entry.type) ? null : entry.type;
    if (typeof entry.sample_size === 'string') {
      const sampleSize = parseInt(entry.sample_size, 10);
      entry.sample_size = Number.isNaN(sampleSize) ? null : sampleSize;
    }

    delete entry.id;
    delete entry.update_comments;
    delete entry.last_modified_by;
    delete entry.last_reviewed_at;
  });

  logger.info('Processed entries, starting database insert');
  // Add to Database
  const result = await db.models.kb_reference.bulkCreate(entries);
  logger.info('Finished loading KB references table.');

  return result;
};
