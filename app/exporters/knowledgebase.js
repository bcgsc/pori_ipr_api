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
  j2p = require('json2plain'),
  remapKeys = require(process.cwd() + '/app/libs/remapKeys'),
  reverseMapKeys = require(process.cwd() + '/app/libs/reverseMapKeys'),
  nconf = require('nconf').file({file: process.cwd() + '/config/'+process.env.NODE_ENV+'.json'});


class ExportKnowledgeBase {

  /**
   * Constructor
   *
   * @param {string} version - The version of KnowledgeBase this export will be
   * @param {object} options - Options object
   */
  constructor(version, options) {
    this.version = version;
    this.directory = {
      output: options.output || null
    };

    this.directory.tsv = this.directory.output + '/data_tsv';

    this.log = "";

    // Load Config
    nconf.file({file: process.cwd() + '/config/'+process.env.NODE_ENV+'.json'});
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

  createReferencesTable() {
    return new Promise((resolve, reject) => {

      let opts = {
        where: {
          status: {
            $not: 'FLAGGED-INCORRECT'
          }
        },
        attributes: {
          exclude: ['id', 'ident', 'createdAt', 'deletedAt', 'dataVersion', 'createdBy_id', 'reviewedBy_id', 'approvedAt']
        }
      };

      db.models.kb_reference.findAll(opts).then(
        (results) => {

          let preMapped = [];

          // Extract raw values into preMapped
          _.forEach(results, (v) => {
            preMapped.push(v.get());
          });


          let file = 'knowledge_base_references.tsv';

          // Reverse Remap keys
          let mapped = reverseMapKeys(preMapped, {"id": "ref_id"});

          let data = new writeCSV(mapped, {separator: "\t", quote: false}).raw();

          let writer_detail = fs.writeFile(this.directory.tsv + '/' + file, data, (err) => {
            if(err) console.log('Error in: ', file, err);

            resolve({stage: 'kb_references', status: true});
          });


        },
        (err) => {
          console.log('Failed to query');
          reject({stage: 'kb_references', status: false, data: err});
        }
      );

    });
  }

  createEventsTable() {
    return new Promise((resolve, reject) => {

      let opts = {
        where: {
          status: {
            $not: 'FLAGGED-INCORRECT'
          }
        },
        attributes: {
          exclude: ['id', 'ident', 'createdAt', 'deletedAt', 'dataVersion', 'createdBy_id', 'reviewedBy_id', 'approvedAt', 'in_version']
        }
      };

      db.models.kb_event.findAll(opts).then(
        (results) => {

          let preMapped = [];

          // Extract raw values into preMapped
          _.forEach(results, (v) => {
            preMapped.push(v.get());
          });


          let file = 'knowledge_base_events.tsv';

          // Reverse Remap keys
          let mapped = reverseMapKeys(preMapped, {});

          let data = new writeCSV(mapped, {separator: "\t", quote: false}).raw();

          let writer_detail = fs.writeFile(this.directory.tsv + '/' + file, data, (err) => {
            if(err) console.log('Error in: ', file, err);

            resolve({stage: 'kb_events', status: true});
          });


        },
        (err) => {
          console.log('Failed to query');
          reject({stage: 'kb_events', status: false, data: err});
        }
      );

    });
  }


  /**
   * Run Exporters
   *
   */
  export() {
    return new Promise((resolve, reject) => {

      this.logLine("## Starting export for " + this.version);

      // Determine location to report base folder
      glob(this.directory.output, (err, folder) => {

        // Check for detection
        if (folder.length === 0) {
          this.logLine("Unable to find the required existing POG folder.");
          reject({
            status: false,
            message: 'Unable to find POG source folder in: ' + nconf.get('paths:data:POGdata') + '/' + this.version
          });
        }

        fs.mkdirSync(this.directory.tsv);

        this.logLine('Export folder created');

        this.createReferencesTable()
          .then(this.createEventsTable.bind(this))
          .then(
          (result) => {
            console.log('Result: ', result);
            resolve({success: true, log: this.log});
          },
          (err) => {
            console.log('Export error', err);
            reject({success: false, log: this.log});
          }
        );

      });
    });
  }

}

module.exports = ExportKnowledgeBase;