const glob = require('glob');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const readFile = util.promisify(require('pyconf').readFile);
const fs = require('fs');
const j2p = require('json2plain');
const nconf = require('nconf').file({file: `../../config/${process.env.NODE_ENV}.json`});

// Valid Exporters
const clinRel = require('./detailedGenomicAnalysis/alterations');
const patientInfo = require('./summary/patientInformation');
const patientTumourAnalysis = require('./summary/tumourAnalysis');
const genomicAltIdentified = require('./summary/genomicAlterationsIdentified');
const genomicEventsEheraAssoc = require('./summary/genomicEventsTherapeutic');


const validExporters = {
  clin_rel: clinRel, // PASSES!
  patient_info: patientInfo, // PASSES!
  patient_tumour_analysis: patientTumourAnalysis, // PASSES!
  genomic_alt_identified: genomicAltIdentified, // PASSES!
  genomic_events_thera_assoc: genomicEventsEheraAssoc, // PASSES!
};

class ExportDataTables {

  /**
   * Constructor
   *
   * @param POGID - Pog ID
   * @param exportEvent - The data export slug
   */
  constructor(pog, exportEvent) {
    this.log = '';
    this.pog = pog;
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
   * @param {string} line
   * @param {integer} spacing
   */
  logLine(line, spacing=0) {
    // Parse
    if(typeof line === 'object') line = j2p(line);

    this.log += line + "\n";
    if(spacing > 0) this.log += "\n".repeat(spacing);
  }

  /**
   * Duplicate the current CSV folder
   *
   */
  duplicateDependencies() {
    let deferred = Q.defer();

    // Duplicate folder
    let child = exec(
      "cp -r " +
      this.directory.sourceReportBase + '/images ' +
      this.directory.sourceReportBase + '/POG684_genomic_report_creation.sh ' +
      this.directory.sourceReportBase + '/POG684.tab ' +
      this.directory.sourceReportBase + '/expr_dens_gene_list.txt ' +

      this.directory.exportReportBase,
      (error, stderr, stdout) => {

        if(stderr) deferred.reject({status: false, message: 'Unable to duplicate existing JReport_CSV_ODF directory', data: stderr});
        if(error) deferred.reject({status: false, message: 'Unable to duplicate existing JReport_CSV_ODF directory', data: error});

        // All good!
        // Copy & rename CSV files
        exec("cp -r " + this.directory.source + ' ' + this.directory.export, (error, stderr, stdout) => {
          deferred.resolve({stage: 'duplicateCSVFolder', status: true});
        });

    });

    return deferred.promise;
  }

  /**
   * Read config file
   *
   */
  readConfigFile() {
    let deferred = Q.defer();

    glob(this.directory.base + '*.auto_generated.cfg', (err, file) => {
      // Read in config file
      pyconf.readFile(file[0], (err, conf) => {
        this.config.original = conf;
        this.config.export = JSON.parse(JSON.stringify(this.config.original));
        deferred.resolve({status: true});
      });
    });

    return deferred.promise;
  }

  /**
   * Write new Config File
   *
   */
  createConfigFile() {
    let deferred = Q.defer();

    // get line to update.
    let folderLine = this.config.original.__keys['Report Tables Folder'];
    let pdfLine = this.config.original.__keys['Report Filename'];
    let reportLine = this.config.original.__keys['Report_Folder'];

    // Update Line
    this.config.export.__lines[folderLine] = 'Report Tables Folder            = ${Report_Folder}/' + this.directory.exportFolderName;
    this.config.export.__lines[pdfLine] = 'Report Filename                 = ${Report_Folder}/POG684_genomic_report_IPR_export_' + this.exportEvent.key+'.pdf';
    this.config.export.__lines[reportLine] = 'Report_Folder                   = ' + this.config.original['Report_Folder'].replace(/(\/report)$/, '/report_IPR_export_'+this.exportEvent.key);

    // Create File
    let data = "## This config file was generated as the result of an export from the Interactive POG Report API\n";
    data += "## Export ident: \n"; // TODO: Place Export Ident
    data += _.join(this.config.export.__lines, "\n");

    let writeConfig = fs.writeFile(this.directory.exportReportBase + '/IPR_Report_export_' + this.exportEvent.key + '.cfg', data, (err) => {
      if(err) console.log('Error write config file: ', err);
      this.logLine('Successfully export config file: IPR_Report_export_' + this.exportEvent.key + '.cfg');

      deferred.resolve({stage: 'config.write', status: true});
    });

    return deferred.promise;
  }

  /**
   * Run Exporters
   *
   */
  export() {
    let deferred = Q.defer();

    this.logLine("## Starting export for "+ this.pog.POGID );
    this.logLine("## Key slug used for this export: "+ this.exportEvent.key);
    this.logLine("## DB Entry detailing this export: "+ this.exportEvent.ident, 2);

    // Determine location to report base folder
    glob(nconf.get('paths:data:POGdata') + '/' + this.pog.POGID + nconf.get('paths:data:reportRoot'), (err, folder) => {

      // Check for detection
      if(folder.length === 0) {
        this.logLine("Unable to find the required existing POG folder.");
        deferred.reject({status: false, message: 'Unable to find POG source folder in: '+nconf.get('paths:data:POGdata') + '/' + this.pog.POGID + nconf.get('paths:data:dataDir'), log: this.log});
      }

      // Set Directory
      this.directory.base = folder[0]; // Base Directory in which all /report* folders are located

      this.directory.sourceReportBase = folder[0] + 'report'; // Source Report Base, in which tracking config, tab file, sh file etc. are located
      this.directory.source = this.directory.sourceReportBase + '/JReport_CSV_ODF'; // Source CSV folder

      this.directory.exportReportBase = folder[0] + 'report_IPR_export_'+this.exportEvent.key; // Target Report Base
      this.directory.export = this.directory.exportReportBase +'/IPR_CSV_export_' + this.exportEvent.key; // Target CSV folder

      this.directory.exportFolderName = 'IPR_CSV_export_' + this.exportEvent.key; // Folder name

      fs.mkdirSync(this.directory.exportReportBase);

      this.logLine('Export folder created');

      this.readConfigFile().then(
        (result) => {

          this.logLine('Finished reading config file', 1);

          // Copy CSV
          this.duplicateDependencies().then(
            (success) => {
              // All good!
              this.logLine('Copied existing data entries successfully.', 1);

              let promises = [];

              // Loop over exporters and gather promises
              _.forEach(validExporters, (v, k) => {
                this.logLine('> Loaded exporter: '+ v);
                promises.push(require(v)(this.pog, this.directory));
              });

              // Run promises sequentially
              Q.all(promises)
                .done(
                  (result) => {
                    this.logLine('');
                    this.logLine('Finished running all exporters:');
                    this.logLine(result, 1);
                    // Successfully ran all exporters

                    this.createConfigFile().then(
                      (res) => {
                        this.logLine('Wrote new config file');

                        let command = '/projects/tumour_char/analysis_scripts/SVIA/jreport_genomic_summary/tags/production/genomicReport.py ' +
                          '-c ' + this.directory.exportReportBase + '/IPR_Report_export_' + this.exportEvent.key + '.cfg ' +
                          '--rebuild-pdf-only';

                        deferred.resolve({status: true, log: this.log, command: command});
                      },
                      (err) => {
                        this.logLine('Failed to write config file');
                        this.logLine(err);
                        deferred.reject({status: false, log: this.log});
                      }
                    );

                    // Return command to run
                    // genomicReport.py --rebuild-pdf-only -c [name of config file]

                  },
                  (err) => {
                    // Exporters failed to finish
                    // TODO: Cleanup! Remove export folder

                    this.logLine('Failed to complete all exporters');
                    this.logLine(err);

                    deferred.reject({status: false, message: 'Failed to complete all exporters.', data: err, log: this.log});
                  }
                );

            },
            (err) => {
              this.logLine('Failed to duplicate existing source folder');
              this.logLine(err);
              deferred.reject({status: false, message: 'Failed to duplicate existing source folder.', data: err, log: this.log});
            }
          );

        },
        (err) => {
          this.logLine('Failed to write config file');
          this.logLine(err);
          deferred.reject({status: false, log: this.log});
        }
      );
    });
    return deferred.promise;
  }

}

module.exports = ExportDataTables;