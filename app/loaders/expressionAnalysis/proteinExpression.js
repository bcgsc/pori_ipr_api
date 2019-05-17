const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const nconf = require('nconf').argv().env().file({file: './config/columnMaps.json'});
const db = require('../../models');
const remapKeys = require('../../libs/remapKeys');
const p2s = require('../../libs/pyToSql');

const logger = require('../../../lib/log');


class ProteinExpressionLoader {
  /**
   * Protein Expression Data Loader
   *
   * @param {object} report - POG report object
   * @param {string} dir - The directory location
   */
  constructor(report, dir) {
    this.report = report;
    this.baseDir = dir;
    this.filesToLoad = [
      {file: 'downregulated_tsg.csv', type: 'downreg_tsg', expType: 'rna'},
      {file: 'upregulated_oncogenes.csv', type: 'upreg_onco', expType: 'rna'},
    ];
    this.entryData = [];
  }

  /**
   * Execute Loader
   *
   * @returns {Promise.<object>} - Returns an object with loader completion status
   */
  async load() {
    const promises = this.filesToLoad.map((ld) => {
      return this.retrieveFileEntry(ld.file, ld.type, ld.expType);
    });

    const results = await Promise.all(promises);
    results.forEach((result) => {
      this.entryData = this.entryData.concat(result);
    });
    await this.insertEntries();
    logger.info('Protein Expression Data completed.');
    return {name: 'proteinExpression', result: true};
  }

  /**
   * Load entryData with file data
   *
   * @param {string} file - The file to load
   * @param {string} type - The KB match type
   * @param {string} expType - The expression outlier type (rna vs protein)
   *
   * @returns {Promise.<Array.<object>>} - Returns an array of new entry data
   */
  async retrieveFileEntry(file, type, expType) {
    // Read in file
    const output = fs.readFileSync(`${this.baseDir}/JReport_CSV_ODF/${file}`);

    // Parse file!
    const result = parse(output, {delimiter: ',', columns: true});
    // Remap results
    const entries = remapKeys(result, nconf.get('expressionAnalysis:outlier'));

    // Add new values for DB
    const newEntryData = entries.map((entry) => {
      const newEntry = p2s(entry, ['rnaReads', 'foldChange', 'ptxPogPerc', 'ptxTotSampObs', 'ptxkIQR', 'ptxPerc']);
      newEntry.pog_id = this.report.pog_id;
      newEntry.pog_report_id = this.report.id;
      newEntry.outlierType = type;
      newEntry.expType = expType;
      return newEntry;
    });
    logger.info(`Parsed ${type} file ${file} successfully.`);

    return newEntryData;
  }

  /**
   * Create new Protein Expression entries
   *
   * @returns {Promise.<Array.<Model>>} - Returns the result of adding the entryData to the db
   */
  async insertEntries() {
    // Add to Database
    const result = await db.models.outlier.bulkCreate(this.entryData);
    logger.info('Protein Expression data loaded.');
    return result;
  }
}

module.exports = ProteinExpressionLoader;
