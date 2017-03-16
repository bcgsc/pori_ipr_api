"use strict";

// app/routes/loadPog.js
let express = require('express'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models'),
  remapKeys = require(process.cwd() + '/app/libs/remapKeys'),
  reverseMapKeys = require(process.cwd() + '/app/libs/reverseMapKeys'),
  _ = require('lodash'),
  writeCSV = require(process.cwd() + '/lib/writeCSV'),
  fs = require('fs'),
  glob = require('glob'),
  exportDataTables = require(process.cwd() + '/app/exporters/index'),
  nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/columnMaps.json'});

// Handle requests for loading POG into DB
router.route('/csv')
  .get((req,res,next) => {

    let exporter = new exportDataTables(req.POG, {stamp: '20170316-101714'});

    exporter.export().then(
      (result) => {
        res.json({command: '/projects/tumour_char/analysis_scripts/SVIA/jreport_genomic_summary/trunk/genomicReport.py -c IPR_Report_export_20170316-101714.cfg --rebuild-pdf-only'});
      },
      (err) => {
        console.log('Failed to run exporters', err);
      }
    );

    /*
    let opts = {
      where: {
        pog_id: req.POG.id
      },
      attributes: {
        exclude: [
          'id',
          'ident',
          'dataVersion',
          'pog_id',
          'newEntry',
          'approvedTherapy',
          'createdAt',
          'updatedAt',
          'deletedAt',
          'kb_newEntry'
        ]
      },
      order: 'gene ASC'
    };

    // Get First Table
    db.models.alterations.findAll(opts).then(
      (results) => {

        let preMapped = [];

        _.forEach(results, (v) => {
          preMapped.push(v.get());
        });

        // Reverse Remap keys
        let mapped = reverseMapKeys(preMapped, nconf.get('detailedGenomicAnalysis:alterations'));

        let processAlteration = (alt) => {
          delete alt.alterationType;
          return alt;
        };

        // Sort into types
        let alterations = {
          clin_rel_known_alt_detailed: [],  // Therapeutic
          clin_rel_known_biol_detailed: [], // Biological
          clin_rel_known_diag_detailed: [], // Diagnostic
          clin_rel_known_prog_detailed: [], // Prognostic
          clin_rel_unknown_alt_detailed: [] // Unknown/Uncharacterized
        };

        // loop over and drop into categories
        _.forEach(mapped, (a) => { //  {therapeutic,prognostic,diagnostic,biological,unknown}
          if(a.alterationType === 'therapeutic') alterations.clin_rel_known_alt_detailed.push(processAlteration(a));
          if(a.alterationType === 'biological') alterations.clin_rel_known_biol_detailed.push(processAlteration(a));
          if(a.alterationType === 'diagnostic') alterations.clin_rel_known_diag_detailed.push(processAlteration(a));
          if(a.alterationType === 'prognostic') alterations.clin_rel_known_prog_detailed.push(processAlteration(a));
          if(a.alterationType === 'unknown') alterations.clin_rel_unknown_alt_detailed.push(processAlteration(a));
        });

        // Write CSV
        _.forEach(alterations, (group, file) => {
          // Write each to a file in the specified directory
          let dir = '/projects/tumour_char/pog/reports/genomic/POG684/P01887_P01879/jreport_genomic_summary_v3.0.1/report/IPR_CSV_export';
          console.log('Attempting to write: ', dir+ '/' + file + '.csv');

          let writer_detail = fs.writeFile(dir + '/' + file + '.csv', writeCSV(group), (err) => {
            if(err) console.log('Error in: ', file, err);
            if(!err) console.log('Successfully wrote: ', file);
          });

          // Same as above without two keys: KB_event_key,	KB_ENTRY_key
          let writer = fs.writeFile(dir + '/' + file.replace('_detailed', '') + '.csv', writeCSV(group, ['KB_event_key','KB_ENTRY_key']), (err) => {
            if(err) console.log('Error in: ', file.replace('_detailed', ''), err);
            if(!err) console.log('Successfully wrote: ', file.replace('_detailed', ''));
          });
        });

        res.send(writeCSV(alterations.clin_rel_known_alt_detailed));

      },
      (err) => {

      }
    ); */

  });


module.exports = router;
