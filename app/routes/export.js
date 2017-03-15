"use strict";

// app/routes/loadPog.js
let express = require('express'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models'),
  remapKeys = require(process.cwd() + '/app/libs/remapKeys'),
  reverseMapKeys = require(process.cwd() + '/app/libs/reverseMapKeys'),
  _ = require('lodash'),
  writeCSV = require(process.cwd() + '/lib/writeCSV'),
  nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/columnMaps.json'});

// Handle requests for loading POG into DB
router.route('/csv')
  .get((req,res,next) => {

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
        let output = writeCSV(alterations.clin_rel_known_alt_detailed);

        res.send(output);

      },
      (err) => {

      }
    );

  });


module.exports = router;
