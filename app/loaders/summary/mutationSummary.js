const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const db = require('../../models');
const pyToSql = require('../../libs/pyToSql');

const {logger} = process;

class MutationSummaryLoader {
  /**
   * Protein Expression Data Loader
   *
   * @param {object} report - POG report model object
   * @param {string} dir - Base directory location
   */
  constructor(report, dir) {
    this.report = report;
    this.baseDir = dir;
    this.files = {
      spectrum: '/JReport_CSV_ODF/mutational_spectrum.csv',
      summary: '/JReport_CSV_ODF/mutation_summary.csv',
    };
    this.entryData = [];
  }

  /**
   * Execute Loader
   *
   * @returns {Promise.<object>} - Returns object with loader completion status
   */
  async load() {
    const file = await this.findFile();
    if (file === 'spectrum') {
      await this.parseSpectrum();
    } else {
      await this.parseSummary();
    }
    await this.insertEntries();
    // Loader finished successfully
    logger.info('Successfully completed mutation summary loader');

    return {loader: 'mutationSummary', success: true};
  }

  /**
   * Determine if spectrum or mutation
   *
   * @returns {Promise.<string>} - Returns the name of the csv file that exists + able to read
   * @throws {Error} - If neither expected file is found
   */
  async findFile() {
    try {
      // Check if mutation summary csv file exists
      fs.accessSync(`${this.baseDir}${this.files.summary}`, fs.R_OK);
      return 'summary';
    } catch (error) {
      // Check if legacy file exsts
      fs.accessSync(`${this.baseDir}${this.files.spectrum}`, fs.R_OK);
      return 'spectrum';
    }
  }

  /**
   * Parse (legacy) Spectrum File
   *
   * Map legacy Mutation Spectrum data to new mutation summary format
   *
   * @returns {Promise.<object>} - Returns the values of the parsed and formatted mutation spectrum data
   */
  async parseSpectrum() {
    const output = fs.readFileSync(`${this.baseDir}${this.files.spectrum}`);

    // Parser
    const result = parse(output, {delimiter: ',', columns: true});

    if (result.length === 0) {
      logger.info(`The CSV file did not contain any data rows: ${this.baseDir}${this.files.spectrum}`);
      throw new Error('The CSV file did not contain any data rows');
    }

    // Pipe through parser
    const values = this.migrateData(result[0]);
    this.entryData.push(values.comparator, values.average);

    return values;
  }

  /**
   * Parse mutation summary entries
   *
   * @returns {Promise.<Array.<object>>} - Returns the array mutation summary entries
   */
  async parseSummary() {
    // Read in file
    const output = fs.readFileSync(`${this.baseDir}${this.files.summary}`);

    // Parse file!
    const results = parse(output, {delimiter: ',', columns: true});

    // Add new values for DB
    const mappedResults = results.map((value) => {
      const newValue = pyToSql(value, ['snv', 'snv_truncating', 'indels', 'indels_frameshift', 'sv', 'sv_expressed', 'snv_percentile', 'indel_percentile', 'sv_percentile']); // Clean out Python Na/NaN/None values
      newValue.pog_id = this.report.pog_id;
      newValue.pog_report_id = this.report.id;
      return newValue;
    });

    this.entryData = this.entryData.concat(mappedResults);
    logger.info(`Parsed mutation summary file ${this.files.summary} successfully.`);

    return this.entryData;
  }

  /**
   * Create new Mutation Summary entries
   *
   * @returns {Promise.<Array.<Model>>} - Returns the created mutation summary entries
   */
  async insertEntries() {
    // Add to Database
    const result = await db.models.mutationSummaryv2.bulkCreate(this.entryData);
    logger.info('Mutation Summary data read into DB.');
    return result;
  }

  /**
   * Convert Legacy Mutation Spectrum row to Updated Model
   *
   * @param {object} row - The legacy format data row for mutation summaries
   *
   * @returns {object} - The returning object has two nested objects: comparator, average
   */
  migrateData(row) {
    const nsSNVTruncating = row['nsSNV-truncating'].split(' ');
    const indelsFrameshift = row['indels-frameshift'].split(' ');
    const svExpressed = row['sv-expressed'].split(' ');
    // Map entries
    const result = {
      comparator: {
        comparator: null,
        snv: pyToSql(nsSNVTruncating[0]),
        snv_truncating: pyToSql(nsSNVTruncating[1].replace(/(\[|\])/g, '')),
        indels: pyToSql(indelsFrameshift[0]),
        indels_frameshift: pyToSql(indelsFrameshift[1].replace(/(\[|\])/g, '')),
        sv: pyToSql(svExpressed[0]),
        sv_expressed: pyToSql(svExpressed[1].replace(/(\[|\])/g, '')),
        snv_percentile: pyToSql(row.SNV_percentile_amongst_specificDisease),
        indel_percentile: pyToSql(row.INDEL_percentile_amongst_specificDisease),
        sv_percentile: null,
        pog_id: this.report.pog_id,
        pog_report_id: this.report.id,
      },
      average: {
        comparator: 'average',
        snv: pyToSql(nsSNVTruncating[0]),
        snv_truncating: pyToSql(nsSNVTruncating[1].replace(/(\[|\])/g, '')),
        indels: pyToSql(indelsFrameshift[0]),
        indels_frameshift: pyToSql(indelsFrameshift[1].replace(/(\[|\])/g, '')),
        sv: pyToSql(svExpressed[0]),
        sv_expressed: pyToSql(svExpressed[1].replace(/(\[|\])/g, '')),
        snv_percentile: pyToSql(row.SNV_percentile_amongst_allTCGA),
        indel_percentile: pyToSql(row.INDEL_percentile_amongst_allTCGA),
        sv_percentile: pyToSql(row.SV_percentile_amongst_allPOG),
        pog_id: this.report.pog_id,
        pog_report_id: this.report.id,
      },
    };
    return result;
  }
}

module.exports = MutationSummaryLoader;
