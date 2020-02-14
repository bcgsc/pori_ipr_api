const glob = require('glob');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const readFile = util.promisify(require('pyconf').readFile);
const fs = require('fs');
const j2p = require('json2plain');
const nconf = require('../config');

// Valid Exporters
const clinRel = require('./detailedGenomicAnalysis/alterations');
const patientInfo = require('./summary/patientInformation');
const patientTumourAnalysis = require('./summary/tumourAnalysis');
const genomicAltIdentified = require('./summary/genomicAlterationsIdentified');
const genomicEventsEheraAssoc = require('./summary/genomicEventsTherapeutic');


const validExporters = {
  clin_rel: clinRel,
  patient_info: patientInfo,
  patient_tumour_analysis: patientTumourAnalysis,
  genomic_alt_identified: genomicAltIdentified,
  genomic_events_thera_assoc: genomicEventsEheraAssoc,
};

class ExportDataTables {
  /**
   * Constructor
   *
   * @param {object} report - Report model object
   * @param {Object.<string, string>} exportEvent  - The data export slug
   */
  constructor(report, exportEvent) {
    this.log = '';
    this.report = report;
    this.exportEvent = exportEvent;
    this.config = {
      original: null,
      export: null,
    };
    this.directory = {
      base: null,
      export: null,
      source: null,
      sourceReportBase: null,
      exportReportBase: null,
      exportFolderName: null,
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

  /**
   * Duplicate the current CSV folder
   *@returns {Promise.<Object.<string, boolean>>} returns the stage and status
   */
  async duplicateDependencies() {
    const base = this.directory.sourceReportBase;
    // Duplicate folder
    await exec(`cp -r ${base}/images ${base}/POG684_genomic_report_creation.sh ${base}/POG684.tab ${base}/expr_dens_gene_list.txt ${this.directory.exportReportBase}`);
    // All good!
    // Copy & rename CSV files
    await exec(`cp -r ${this.directory.source} ${this.directory.export}`);
    return {stage: 'duplicateCSVFolder', status: true};
  }

  /**
   * Read config file
   *
   * @returns {Promise.<Object.<boolean>>} returns the status
   */
  async readConfigFile() {
    const files = glob.sync(`${this.directory.base}*.auto_generated.cfg`);
    // Read in config file
    const conf = await readFile(files[0]);
    this.config.original = conf;
    this.config.export = JSON.parse(JSON.stringify(this.config.original));
    return {status: true};
  }

  /**
   * Write new Config File
   *
   * @returns {Promise.<Object.<string, boolean>>} returns the stage and the status
   */
  async createConfigFile() {
    // get line to update.
    const folderLine = this.config.original.__keys['Report Tables Folder'];
    const pdfLine = this.config.original.__keys['Report Filename'];
    const reportLine = this.config.original.__keys.Report_Folder;

    // Update Line
    const reportFolder = '${Report_Folder}';
    this.config.export.__lines[folderLine] = `Report Tables Folder = ${reportFolder}/${this.directory.exportFolderName}`;
    this.config.export.__lines[pdfLine] = `Report Filename = ${reportFolder}/POG684_genomic_report_IPR_export_${this.exportEvent.key}.pdf`;
    this.config.export.__lines[reportLine] = `Report_Folder = ${this.config.original.Report_Folder.replace(/(\/report)$/, `/report_IPR_export_${this.exportEvent.key}`)}`;

    // Create File
    const data = `## This config file was generated as the result of an export from the Interactive Patient Report API\n## Export ident: \n${this.config.export.__lines.join('\n')}`;

    fs.writeFileSync(`${this.directory.exportReportBase}/IPR_Report_export_${this.exportEvent.key}.cfg`, data);
    this.logLine(`Successfully export config file: IPR_Report_export_${this.exportEvent.key}.cfg`);
    return {stage: 'config.write', status: true};
  }

  /**
   * Run Exporters
   * @returns {Promise.<Object.<boolean, string, string>>} returns status, the log file, and the command
   */
  async export() {
    this.logLine(`## Starting export for report: ${this.report.ident}`);
    this.logLine(`## Key slug used for this export: ${this.exportEvent.key}`);
    this.logLine(`## DB Entry detailing this export: ${this.exportEvent.ident}`, 2);

    // Determine location to report base folder
    const folder = glob.sync(`${nconf.get('paths:data:POGdata')}/${this.report.ident}${nconf.get('paths:data:reportRoot')}`);

    // Check for detection
    if (folder.length === 0) {
      this.logLine('Unable to find the required existing report folder.');
      throw new Error(`Unable to find report source folder in: ${nconf.get('paths:data:POGdata')}/${this.report.ident}${nconf.get('paths:data:dataDir')}`);
    }

    // Set Directory
    this.directory.base = folder[0]; // Base Directory in which all /report* folders are located

    this.directory.sourceReportBase = `${folder[0]}report`; // Source Report Base, in which tracking config, tab file, sh file etc. are located
    this.directory.source = `${this.directory.sourceReportBase}/JReport_CSV_ODF`; // Source CSV folder

    this.directory.exportReportBase = `${folder[0]}report_IPR_export_${this.exportEvent.key}`; // Target Report Base
    this.directory.export = `${this.directory.exportReportBase}/IPR_CSV_export_${this.exportEvent.key}`; // Target CSV folder

    this.directory.exportFolderName = `IPR_CSV_export_${this.exportEvent.key}`; // Folder name

    fs.mkdirSync(this.directory.exportReportBase);

    this.logLine('Export folder created');

    await this.readConfigFile();
    this.logLine('Finished reading config file', 1);

    // Copy CSV
    await this.duplicateDependencies();
    // All good!
    this.logLine('Copied existing data entries successfully.', 1);

    const promises = [];
    // Loop over exporters and gather promises
    // validExporters is an object
    Object.entries(validExporters).forEach(([expLabel, expFunc]) => {
      this.logLine(`> Loaded exporter: ${expLabel}`);
      promises.push(expFunc(this.report, this.directory));
    });

    const result = await Promise.all(promises);
    this.logLine('');
    this.logLine('Finished running all exporters:');
    this.logLine(result, 1);

    await this.createConfigFile();
    this.logLine('Wrote new config file');

    const command = `/projects/tumour_char/analysis_scripts/SVIA/jreport_genomic_summary/tags/production/genomicReport.py -c ${this.directory.exportReportBase}/IPR_Report_export_${this.exportEvent.key}.cfg --rebuild-pdf-only`;
    return {status: true, log: this.log, command};
  }
}

module.exports = ExportDataTables;
