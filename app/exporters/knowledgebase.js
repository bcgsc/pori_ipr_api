const glob = require('glob');
const fs = require('fs');
const j2p = require('json2plain');
const nconf = require('nconf').file({file: `../../config/${process.env.NODE_ENV}.json`});

const db = require('../../app/models');
const WriteCSV = require('../../lib/writeCSV');
const reverseMapKeys = require('../../app/libs/reverseMapKeys');


class ExportKnowledgeBase {
  /**
   * Constructor
   *
   * @param {string} version - The version of KnowledgeBase this export will be
   * @param {object} options - Options object
   */
  constructor(version, options) {
    this.version = version;
    this.log = '';
    this.directory = {
      output: options.output || null,
      tsv: `${options.output || null}/data_tsv`,
    };
  }

  /**
   * Utility to add lines to log
   *
   * @param {string} line a message to log
   * @param {integer} spacing number of blank lines to add to end of message
   * @returns {undefined}
   */
  logLine(line, spacing = 0) {
    // Parse
    if (typeof line === 'object') {
      line = j2p(line);
    }
    this.log += `${line}\n`;
    if (spacing > 0) {
      this.log += '\n'.repeat(spacing);
    }
  }

  async createReferencesTable() {
    const opts = {
      where: {
        status: {
          $not: 'FLAGGED-INCORRECT',
        },
      },
      attributes: {
        exclude: ['id', 'ident', 'createdAt', 'deletedAt', 'dataVersion', 'createdBy_id', 'reviewedBy_id', 'approvedAt'],
      },
    };

    const file = 'knowledge_base_references.tsv';
    const results = await db.models.kb_reference.findAll(opts);
    // Extract raw values into preMapped
    const preMapped = results.map(value => value.get());

    // Reverse Remap keys
    const mapped = reverseMapKeys(preMapped, {id: 'ref_id'});
    const data = new WriteCSV(mapped, {separator: '\t', quote: false}).raw();
    fs.writeFileSync(`${this.directory.tsv}/${file}`, data);
    return {stage: 'kb_references', status: true};
  }

  async createEventsTable() {
    const opts = {
      where: {
        status: {
          $not: 'FLAGGED-INCORRECT',
        },
      },
      attributes: {
        exclude: ['id', 'ident', 'createdAt', 'deletedAt', 'dataVersion', 'createdBy_id', 'reviewedBy_id', 'approvedAt', 'in_version'],
      },
    };

    const file = 'knowledge_base_events.tsv';
    const results = await db.models.kb_event.findAll(opts);
    // Extract raw values into preMapped
    const preMapped = results.map(value => value.get());

    // Reverse Remap keys
    const mapped = reverseMapKeys(preMapped, {});
    const data = new WriteCSV(mapped, {separator: '\t', quote: false}).raw();
    fs.writeFileSync(`${this.directory.tsv}/${file}`, data);
    return {stage: 'kb_events', status: true};
  }


  /**
   * Run Exporters
   * @returns {Promise.<Object.<boolean, string>>} returns success and the log
   */
  async export() {
    this.logLine(`## Starting export for ${this.version}`);

    // Determine location to report base folder
    // folder is an array of strings
    const folder = glob.sync(this.directory.output);

    // Check for detection
    if (folder.length === 0) {
      this.logLine('Unable to find the required existing POG folder.');
      throw new Error(`Unable to find POG source folder in: ${nconf.get('paths:data:POGdata')}/${this.version}`);
    }
    fs.mkdirSync(this.directory.tsv);
    this.logLine('Export folder created');
    await this.createReferencesTable();
    await this.createEventsTable.bind(this);
    return {success: true, log: this.log};
  }
}

module.exports = ExportKnowledgeBase;
