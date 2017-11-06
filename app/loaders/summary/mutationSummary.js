"use strict";

// Dependencies
let db = require(process.cwd() + '/app/models'),
    fs = require('fs'),
    parse = require('csv-parse'),
    p2s = require(process.cwd() + '/app/libs/pyToSql'),
    remapKeys = require(process.cwd() + '/app/libs/remapKeys'),
    _ = require('lodash'),
    Q = require('q'),
    nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/columnMaps.json'});

/*
 * Load Mutation Summary File
 *
 * 
 * @param object POG - POG model object
 *
 */

/*
module.exports = (report, dir, logger) => {
  
  let required = {
    integer: ['snvPercentileTCGA', 'indelPercentileTCGA', 'svPercentilePOG']
  };
  let validation = true;
  
  // Create promise
  let deferred = Q.defer();
  
  // Parsse input file
  let output = fs.createReadStream(dir + '/JReport_CSV_ODF/mutational_spectrum.csv')
  
  // Setup Logger
  let log = logger.loader(report.ident, 'Summary.MutationSummary');
  
  log('Found and read mutational_spectrum.csv file.');
  
  // Parse file!
  let parser = parse({delimiter: ',', columns: true},
    (err, result) => {
      
      // Was there a problem processing the file?
      if(err) {
        log('Unable to parse CSV file');
        console.log(err);
        deferred.reject({loader: 'mutationSummary', message: 'Unable to parse the source file: ' + dir + '/JReport_CSV_ODF/mutational_spectrum.csv'});
      }
      
      if(result.length > 1) return new Error('['+report.ident+'][Loader][Summary.MutationSummary] More than one mutation summary entry found.');
    
      // Remap results
      let entry = _.head(remapKeys(result, nconf.get('summary:mutation')));
      
      // Ensure we have integers
      _.forEach(entry, (val, col) => {
        if(required.integer.indexOf(col) > -1 && isNaN(parseInt(val))) {
          validation = false;
          deferred.reject({loader: 'mutationSummary', message: 'na values are not allowed. Expecting integers for column: ' + col, source: dir + '/JReport_CSV_ODF/mutational_spectrum.csv'});
          return new Error('['+report.ident+'][Loader][Summary.MutationSummary] na values are not allowed. Expecting integers.');
        }
      });
      
      // Map needed DB column values
      entry.pog_id = report.pog_id;
      entry.pog_report_id = report.id;
      
      if(validation) {
        // Add to Database
        db.models.mutationSummary.create(entry).then(
          (result) => {
            // Done
            log('Patient mutation summary loaded.', logger.SUCCESS);
      
            // Resolve Promise
            deferred.resolve(entry);
          },
          (err) => {
            console.log(err);
            deferred.reject({loader: 'mutationSummary', message: 'Unable to create database entries'});
            log('Failed to create mutation summary entry.', logger.ERROR);
          }
        );
      } else {
        return;
      }
    }
  );
  
  // Pipe file through parser
  output.pipe(parser);
  
  output.on('error', (err) => {
    log('Unable to find required CSV file');
    deferred.reject({loader: 'mutationSummary', message: 'Unable to find the source file: ' + dir + '/JReport_CSV_ODF/mutational_spectrum.csv'});
  });
  
  return deferred.promise;
  
} */





/**
 * Protein Expression Data Loader
 *
 */
class mutationSummaryLoader {
  
  constructor(report, dir, logger) {
    
    this.report = report;
    this.baseDir = dir;
    this.logger = logger;
    this.logging = logger.loader(this.report.ident, 'Summary.Mutation');
    this.files = {
      spectrum: '/JReport_CSV_ODF/mutational_spectrum.csv',
      summary: '/JReport_CSV_ODF/mutation_summary.csv'
    };
    this.entryData = [];
    
    this.logging('Starting Mutation Summary Loader');
    
  }
  
  /**
   * Execute Loader
   *
   * @returns {Promise|object} - Returns object with loader completion status
   */
  load() {
    return new Promise((resolve,reject) => {
      
      this.findFile()
        .then((found) => {
          if(found === 'spectrum') return this.parseSpectrum();
          if(found === 'summary') return this.parseSummary();
        })
        .then(this.insertEntries.bind(this))
        .then((result) => {
          // Loader finished successfully
          this.logging('Successfully completed mutation summary loader', this.logger.SUCCESS);
          resolve({loader: 'mutationSummary', success: true});
          
        })
        .catch((err) => {
          // Loader failed at one point or another
          reject({loader: 'mutationSummary', message: 'Failed to execute Mutation Summary loader: ' + err.message, cause: err});
          this.logging('Failed to execute Mutation Summary loader', this.logger.ERROR);
        });
      
      
    });
  }
  
  
  /**
   * Determine if spectrum or mutation
   *
   * @returns {Promise}
   */
  findFile() {
  
    return new Promise((resolve, reject) => {
    
      // Check if mutation summary csv file exists
      fs.access(this.baseDir + this.files.summary, 'r', (err) => {
        
        // File not found, try to find spectrum file
        if(err !== null && err.code === 'ENOENT') {
          
          // Check if legacy file exsts
          fs.access(this.baseDir + this.files.spectrum, 'r', (err) => {
            
            if(err !== null && err.code === 'ENOENT') {
              console.log('Failed to find', this.baseDir + this.files.spectrum);
              this.logging('Unable to find Mutation Summary file (neither current or legacy)', this.logger.ERROR);
              reject({loader: 'mutationSummary', message: "Failed to find the required file(s) to import mutation summary/burden information."});
            } else {
              resolve('spectrum');
            }
          });
        }
        
        // No error, resolve with summary!
        if(!err) {
          resolve('summary');
        }
        
      });
    });
  }
  
  
  /**
   * Parse (legacy) Spectrum File
   *
   * Map legacy Mutation Spectrum data to new mutation summary format
   *
   * @returns {Promise}
   */
  parseSpectrum() {
    return new Promise((resolve, reject) => {
      
      let output = fs.createReadStream(this.baseDir + this.files.spectrum);
      
      // Parser
      let parser = parse({delimiter: ',', columns: true}, (err, result) => {
        
        
        if(err) {
          this.logging('Unable to parse CSV file: ' + this.baseDir + this.files.spectrum, this.logger.ERROR);
          console.log(err);
          reject({loader: 'mutationSummary', message: 'Unable to parse the mutation summary file: ' + this.baseDir + this.files.spectrum, result: false});
        }
        
        if(result.length === 0) {
          this.logging('The CSV file did not contain any data rows: ' + this.baseDir + this.files.spectrum, this.logger.ERROR);
          reject({loader: 'mutationSummary', message: 'The CSV file did not contain any data rows', result: false});
        }
        
        // Pipe through parser
        let values = this.migrateData(result[0]);
        
        this.entryData.push(values.comparator, values.average);
        
        resolve();
      
      });
      
      // Pipe parser
      output.pipe(parser);
      
      // On Error
      output.on('error', (err) => {
        this.logging('Unable to find required file: ' + this.baseDir + this.files.spectrum, this.logger.WARNING, this.logger.ERROR);
        reject({loader: 'mutationSummary', message: 'Unable to find the protein expression file: ' + this.baseDir + this.files.spectrum, result: false});
      });
    
    });
  }
  
  
  /**
   * Parse mutation summary entries
   *
   * @returns {Promise}
   */
  parseSummary() {
    return new Promise((resolve, reject) => {
      
      // Read in file
      let output = fs.createReadStream(this.baseDir + this.files.summary);
      
      // Parse file!
      let parser = parse({delimiter: ',', columns: true},
        (err, results) => {
          
          // Was there a problem processing the file?
          if(err) {
            this.logging('Unable to parse CSV file: ' + this.baseDir + this.files.spectrum, this.logger.ERROR);
            console.log(err);
            reject({loader: 'mutationSummary', message: 'Unable to parse the protein expression file: ' + this.baseDir + this.files.spectrum, result: false});
          }
          
          // Add new values for DB
          results.forEach((v, k) => {
            results[k] = p2s(v, ['snv', 'snv_truncating', 'indels', 'indels_frameshift', 'sv', 'sv_expressed', 'snv_percentile', 'indel_percentile', 'sv_percentile']); // Clean out Python Na/NaN/None values
            results[k].pog_id = this.report.pog_id;
            results[k].pog_report_id = this.report.id;
          });
          
          this.entryData = this.entryData.concat(results);
          
          this.logging('Parsed mutation summary file ' + this.files.summary + ' successfully.', this.logger.SUCCESS);
          
          // Resolve With the data entries
          resolve(true);
        }
      );
      
      // Pipe file through parser
      output.pipe(parser);
      
      // Handle parsing pipe errors
      output.on('error', (err) => {
        this.logging('Unable to find required file: ' + this.baseDir + this.files.summary, this.logger.WARNING, this.logger.ERROR);
        reject({loader: 'mutationSummary', message: 'Unable to find the protein expression file: ' + this.baseDir + file, result: false});
      });
      
    });
  }
  
  
  /**
   * Create new Mutation Summary entries
   *
   * @returns {Promise}
   */
  insertEntries() {
    return new Promise((resolve, reject) => {
      
      // Add to Database
      db.models.mutationSummaryv2.bulkCreate(this.entryData).then(
        (result) => {
          this.logging('Mutation Summary data read into DB.');
          resolve(result);
        },
        (err) => {
          this.logging('Failed to load mutation summary data: ' + err.message, this.logger.ERROR);
          console.log(err);
          reject({loader: 'mutationSummary', message: 'Unable to create database entries', result: false});
        }
      );
      
    });
  }
  
  /**
   * Convert Legacy Mutation Spectrum row to Updated Model
   *
   * @param {object} row - The legacy format data row for mutation summaries
   *
   * @returns {object} - The returning object has two nested objects: comparator, average
   */
  migrateData(row) {
    
    // Map entries
    let result = {
      comparator: {
        comparator: null,
        snv: p2s(row['nsSNV-truncating'].split(' ')[0]),
        snv_truncating: p2s(row['nsSNV-truncating'].split(' ')[1].replace(/(\[|\])/g, '')),
        indels: p2s(row['indels-frameshift'].split(' ')[0]),
        indels_frameshift: p2s(row['indels-frameshift'].split(' ')[1].replace(/(\[|\])/g, '')),
        sv: p2s(row['sv-expressed'].split(' ')[0]),
        sv_expressed: p2s(row['sv-expressed'].split(' ')[1].replace(/(\[|\])/g, '')),
        snv_percentile: p2s(row['SNV_percentile_amongst_specificDisease']),
        indel_percentile: p2s(row['INDEL_percentile_amongst_specificDisease']),
        sv_percentile: null,
        pog_id: this.report.pog_id,
        pog_report_id: this.report.id
      },
      average: {
        comparator: 'average',
        snv: p2s(row['nsSNV-truncating'].split(' ')[0]),
        snv_truncating: p2s(row['nsSNV-truncating'].split(' ')[1].replace(/(\[|\])/g, '')),
        indels: p2s(row['indels-frameshift'].split(' ')[0]),
        indels_frameshift: p2s(row['indels-frameshift'].split(' ')[1].replace(/(\[|\])/g, '')),
        sv: p2s(row['sv-expressed'].split(' ')[0]),
        sv_expressed: p2s(row['sv-expressed'].split(' ')[1].replace(/(\[|\])/g, '')),
        snv_percentile: p2s(row['SNV_percentile_amongst_allTCGA']),
        indel_percentile: p2s(row['INDEL_percentile_amongst_allTCGA']),
        sv_percentile: p2s(row['SV_percentile_amongst_allPOG']),
        pog_id: this.report.pog_id,
        pog_report_id: this.report.id
      }
    };
    
    return result;
    
  }
  
}

module.exports = mutationSummaryLoader;
