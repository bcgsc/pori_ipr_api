"use strict";

const
  _ = require('lodash'),
  db = require(process.cwd() + '/app/models'),
  Q = require('q'),
  exec = require('child_process').exec,
  glob = require('glob'),
  writeCSV = require(process.cwd() + '/lib/writeCSV'),
  pyconf = require('pyconf'),
  fs = require('fs'),
  nconf = require('nconf').file({file: process.cwd() + '/config/'+process.env.NODE_ENV+'.json'});


const validExporters = {
  'clin_rel': './detailedGenomicAnalysis/alterations',                  // PASSES!
  'patient_info': './summary/patientInformation',                       // PASSES!
  'patient_tumour_analysis': './summary/tumourAnalysis',                // PASSES!
  'genomic_alt_identified': './summary/genomicAlterationsIdentified',   // PASSES!
  'genomic_events_thera_assoc': './summary/genomicEventsTherapeutic',   // PASSES!
  //'variant_counts': './summary/variantCount'                          // ??
};

class ExportDataTables {

  /**
   * Constructor
   *
   * @param POGID - Pog ID
   * @param exportEvent - The data export slug
   */
  constructor(pog, exportEvent) {
    this.pog = pog;
    this.exportEvent = exportEvent;
    this.config = {
      original: null,
      'export': null
    };
    this.directory = {
      base: null,
      export: null,
      source: null,
      sourceReportBase: null,
      exportReportBase: null,
      exportFolderName: null
    };

    // Load Config
    nconf.file({file: process.cwd() + '/config/'+process.env.NODE_ENV+'.json'});
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
        console.log('Read in config file');
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


    console.log('Starting to write config file');

    // get line to update.
    let folderLine = this.config.original.__keys['Report Tables Folder'];
    let pdfLine = this.config.original.__keys['Report Filename'];
    let reportLine = this.config.original.__keys['Report_Folder'];

    // Update Line
    this.config.export.__lines[folderLine] = 'Report Tables Folder            = ${Report_Folder}/' + this.directory.exportFolderName;
    this.config.export.__lines[pdfLine] = 'Report Filename                 = ${Report_Folder}/POG684_genomic_report_IPR_export_' + this.exportEvent.stamp+'.pdf';
    this.config.export.__lines[reportLine] = 'Report_Folder                   = ' + this.config.original['Report_Folder'].replace(/(\/report)$/, '/report_IPR_export_'+this.exportEvent.stamp);

    console.log('Updated lines');

    // Create File
    let data = "## This config file was generated as the result of an export from the Interactive POG Report API\n";
    data += "## Export ident: \n"; // TODO: Place Export Ident
    data += _.join(this.config.export.__lines, "\n");

    console.log('Attempting to write config: ', this.directory.exportReportBase + '/IPR_Report_export_' + this.exportEvent.stamp + '.cfg');

    let writeConfig = fs.writeFile(this.directory.exportReportBase + '/IPR_Report_export_' + this.exportEvent.stamp + '.cfg', data, (err) => {
      console.log('File written...');
      if(err) console.log('Error write config file: ', err);
      if(!err) console.log('Successfully export config file: ', 'IPR_Report_export_' + this.exportEvent.stamp + '.cfg');

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


    // Determine location to report base folder
    glob(nconf.get('paths:data:POGdata') + '/' + this.pog.POGID + nconf.get('paths:data:reportRoot'), (err, folder) => {

      // Check for detection
      if(folder.length === 0) deferred.reject({status: false, message: 'Unable to find POG source folder in: '+nconf.get('paths:data:POGdata') + '/' + this.pog.POGID + nconf.get('paths:data:dataDir')});

      // Set Directory
      this.directory.base = folder[0]; // Base Directory in which all /report* folders are located

      this.directory.sourceReportBase = folder[0] + 'report'; // Source Report Base, in which tracking config, tab file, sh file etc. are located
      this.directory.source = this.directory.sourceReportBase + '/JReport_CSV_ODF'; // Source CSV folder

      this.directory.exportReportBase = folder[0] + 'report_IPR_export_'+this.exportEvent.stamp; // Target Report Base
      this.directory.export = this.directory.exportReportBase +'/IPR_CSV_export_' + this.exportEvent.stamp; // Target CSV folder

      this.directory.exportFolderName = 'IPR_CSV_export_' + this.exportEvent.stamp; // Folder name

      fs.mkdirSync(this.directory.exportReportBase);
      this.readConfigFile().then(
        (result) => {

          console.log('Finished reading config file');

          // Copy CSV
          this.duplicateDependencies().then(
            (success) => {
              // All good!
              console.log('Exported data folder successfully');

              let promises = [];

              // Loop over exporters and gather promises
              _.forEach(validExporters, (v, k) => {
                console.log('Requiring', v);
                promises.push(require(v)(this.pog, this.directory));
              });

              // Run promises sequentially
              Q.all(promises)
                .done(
                  (result) => {
                    console.log('Finished exporters!', result);
                    // Successfully ran all exporters

                    this.createConfigFile().then(
                      (res) => {
                        console.log('Wrote config file!');
                        deferred.resolve({status: true});
                      },
                      (err) => {
                        console.log('Failed to write config file', err);
                        deferred.reject({status: false});
                      }
                    );

                    // Return command to run
                    // genomicReport.py --rebuild-pdf-only -c [name of config file]

                  },
                  (err) => {
                    // Exporters failed to finish
                    // TODO: Cleanup! Remove export folder
                    deferred.reject({status: false, message: 'Failed to complete all exporters.', data: err});
                  }
                );

            },
            (err) => {
              deferred.reject({status: false, message: 'Failed to duplicate existing source folder.', data: err});
            }
          );

        },
        (err) => {
          console.log('Failed to write config file', err);
          deferred.reject({status: false});
        }
      );


      /*
       */

    });

    // Collect exports and build all

    return deferred.promise;
  }

}

module.exports = ExportDataTables;