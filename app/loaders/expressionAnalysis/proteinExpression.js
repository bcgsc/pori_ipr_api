"use strict";

// Dependencies
let db = require(process.cwd() + '/app/models'),
  fs = require('fs'),
  parse = require('csv-parse'),
  remapKeys = require(process.cwd() + '/app/libs/remapKeys'),
  _ = require('lodash'),
  nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/columnMaps.json'});

/**
 * Protein Expression Data Loader
 *
 */
class proteinExpressionLoader {
  
  constructor(report, dir, logger) {
    
    this.report = report;
    this.baseDir = dir;
    this.logger = logger;
    this.logging = logger.loader(this.report.ident, 'Expression.Protein');
    this.filesToLoad = [
      {file: 'ptx_biol.csv', type: 'biological'},
      {file: 'ptx_pot_clin_rel.csv', type: 'clinical'},
      {file: 'ptx_prog_diag.csv', type: 'nostic'},
    ];
    this.entryData = [];
    
    this.logging('Starting Protein Expression loader');
    
  }
  
  /**
   * Execute Loader
   *
   * @returns {Promise|object} - Returns object with loader completion status
   */
  load() {
    return new Promise((resolve,reject) => {
      
      let promises = [];
      
      _.forEach(this.filesToLoad, (ld) => {
        promises.push(this.retrieveFileEntry(ld.file, ld.type));
      });
      
      Promise.all(promises)
        .then(this.insertEntries.bind(this))
        .then(
          (result) => {
            this.logging('Protein Expression Data completed.', this.logger.SUCCESS);
            resolve({name: 'proteinExpression', result: true});
          },
          (err) => {
            console.log(err);
            this.logging('Protein Expression Data was not able to complete.', this.logger.ERROR);
            resolve({loader: 'proteinExpression', message: 'Unable to load protein expression data: ' + err.message, result: false});
          }
        )
        .catch((err) => {
          console.log('Error loading Protein Expression data', err);
          this.logging('Failed to load protein expression data:' + err.message);
          resolve({loader: 'proteinExpression', message: 'Failed to load protein expression data:' + err.message, result: false});
        });
      
    });
  }
  
  /**
   * Load
   *
   * @returns {Promise}
   */
  retrieveFileEntry(file, type) {
    return new Promise((resolve, reject) => {
      
      // Read in file
      let output = fs.createReadStream(this.baseDir + '/JReport_CSV_ODF/' + file);
      
      // Parse file!
      let parser = parse({delimiter: ',', columns: true},
        (err, result) => {
          
          // Was there a problem processing the file?
          if(err) {
            this.logging('Unable to parse CSV file: ' + this.baseDir + '/JReport_CSV_ODF/' + file);
            console.log(err);
            reject({loader: 'proteinExpression', message: 'Unable to parse the protein expression file: ' + this.baseDir + '/JReport_CSV_ODF/' + file, result: false});
          }
  
          // Remap results
          let entries = remapKeys(result, nconf.get('expressionAnalysis:proteinExpression'));
  
          // Add new values for DB
          entries.forEach((v, k) => {
            // Map needed DB column values
            entries[k].pog_id = this.report.pog_id;
            entries[k].pog_report_id = this.report.id;
            entries[k].proteinType = type;
          });
  
          this.entryData = this.entryData.concat(entries);
  
          this.logging('Parsed ' + type + ' file ' + file + ' successfully.');
  
          // Resolve With the data entries
          resolve(true);
        }
      );
      
      // Pipe file through parser
      output.pipe(parser);
      
      output.on('error', (err) => {
        this.logging('Unable to find required file: ' + this.baseDir + '/JReport_CSV_ODF/' + file, this.logger.WARNING);
        reject({loader: 'proteinExpression', message: 'Unable to find the protein expression file: ' + this.baseDir + '/JReport_CSV_ODF/' + file, result: false});
      });
      
    });
  }
  
  
  /**
   * Create new Protein Expression entries
   *
   * @returns {Promise}
   */
  insertEntries() {
    return new Promise((resolve, reject) => {
      
      // Add to Database
      db.models.proteinExpression.bulkCreate(this.entryData).then(
        (result) => {
          
          this.logging('Protein Expression data loaded.', this.logger.SUCCESS);
          resolve(result);
          
        },
        (err) => {
          this.logging('Failed to load protein expression data.', this.logger.ERROR);
          reject({loader: 'proteinExpression', message: 'Unable to create database entries', result: false});
        }
      );
      
    });
  }
  
}

module.exports = proteinExpressionLoader;
