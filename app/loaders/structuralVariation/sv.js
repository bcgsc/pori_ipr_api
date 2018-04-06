"use strict";

// Dependencies
let db = require(process.cwd() + '/app/models'),
  fs = require('fs'),
  parse = require('csv-parse'),
  remapKeys = require(process.cwd() + '/app/libs/remapKeys'),
  mavis = require(process.cwd() + '/app/libs/mavis'),
  _ = require('lodash'),
  Q = require('q'),
  nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/columnMaps.json'});

let baseDir;

/*
 * Parse Structural Variations Mutations File
 *
 *
 * @param object POG - POG model object
 * @param string structuralVariationFile - name of CSV file for given small mutation type
 * @param string variantType - variantType of these entries (clinical, nostic, biological, fusionOmicSupport)
 * @param object log - /app/libs/logger instance
 *
 */
let parseStructuralVariantFile = (report, structuralVariationFile, variantType, log) => {

  // Create promise
  let deferred = Q.defer();

  // Check that the provided alterationType is valid according to the schema
  if(db.models.sv.rawAttributes.svVariant.values.indexOf(variantType) === -1) deferred.reject('Invalid variantType. Given: ' + variantType) && new Error('Invalid variantType. Given: ' + variantType);

  // First parse in therapeutic
  let output = fs.createReadStream(baseDir + '/JReport_CSV_ODF/' + structuralVariationFile, {'delimiter': ','});

  // Parse file!
  let parser = parse({delimiter: ',', columns: true},
    (err, result) => {

      // Was there a problem processing the file?
      if(err) {
        log('Unable to parse CSV file');
        console.log(err);
        deferred.reject({loader: 'structuralVariants', message: 'Unable to parse the structural variants file: ' + baseDir + '/JReport_CSV_ODF/' + structuralVariationFile, result: false});
      }

      // Remap results
      let entries = remapKeys(result, nconf.get('structuralVariation:sv'));

      // Add new values for DB
      entries.forEach((v, k) => {
        // Map needed DB column values
        entries[k].pog_id = report.pog_id;
        entries[k].pog_report_id = report.id;
        entries[k].svVariant = variantType;
        entries[k].mavis_product_id = entries[k].MAVIS_product_id;

        if(v.svg !== 'na' && v.svg !== '') {
          // Load in SVG !! SYNC-Block
          try {
            entries[k].svg = fs.readFileSync(v.svg, "utf-8");
          }
          catch (e) {
            deferred.reject({message: 'Failed to read SVG file: ' + e.message, cause: e});
            console.log('Failed to load SV SVG file', e);
          }
          
          try {
            // Load in Text File !! SYNC-Block
            entries[k].svgTitle = fs.readFileSync(v.svgTitle, "utf-8");
          }
          catch (e) {
            deferred.reject({message: 'Failed to read SVG title file: ' + e.message, cause: e});
            console.log('Failed to load SV SVG title file', e);
          }
        }

        // Set null values
        if(v.svg === 'na' || v.svg === '') {
          entries[k].svg =
          entries[k].svgTitle =
          entries[k].name =
          entries[k].frame =
          entries[k].ctermGene =
          entries[k].ntermGene =
          entries[k].ctermTranscript =
          entries[k].ntermTranscript = null;
        }
      });

      // Log progress
      log('Parsed .csv for: ' + variantType);

      // Resolve Promise
      deferred.resolve(entries);
    }
  );

  // Pipe file through parser
  output.pipe(parser);

  output.on('error', (err) => {
    log('Unable to find required CSV file: ' + structuralVariationFile);
    deferred.reject({loader: 'structuralVariants', message: 'Unable to find the structural variants file: ' + baseDir + '/JReport_CSV_ODF/' + structuralVariationFile, result: false});
  });

  return deferred.promise;

};

/**
 * Structural Variation - Structural Variants Loader
 *
 * Load values for "Structural Variation: Genomic Details"
 * sources:
 *  - sv_fusion_biol.csv   -Biological
 *  - sv_fusion_clin_rel.csv  -Clinical
 *  - sv_fusion_prog_diag.csv  -Nostic
 *  - sv_fusion_transcribed.csv  -fusionOmicSupport
 *
 * Create DB entries for Small Mutations. Parse in CSV values, mutate, insert.
 *
 * @param {object} report - POG report model object
 * @param {string} dir - Root directory
 * @param {object} logger - logging interface
 *
 */
module.exports = (report, dir, logger, moduleOptions) => {

  baseDir = dir;

  // Create promise
  let deferred = Q.defer();

  // Setup Logger
  let log = logger.loader(report.ident, 'SV.StructuralVariants');

  // Small Mutations to be processed
  let sources = [
    {file: 'sv_fusion_biol.csv', type: 'biological'},
    {file: 'sv_fusion_clin_rel.csv', type: 'clinical'},
    {file: 'sv_fusion_prog_diag.csv', type: 'nostic'},
    {file: 'sv_fusion_transcribed.csv', type: 'fusionOmicSupport'}
  ];

  // Promises Array
  let promises = [];

  // Loop over sources and collect promises
  sources.forEach((input) => {
    promises.push(parseStructuralVariantFile(report, input.file, input.type, log));
  });

  // Wait for all promises to be resolved
  let svResults;
  Q.all(promises)
    .then((results) => {
      // Log progress
      log('Structural Variations: ' + _.flattenDepth(results, 2).length);

      // Load into Database
      db.models.sv.bulkCreate(_.flattenDepth(results, 2)).then(
        (result) => {

          // Successful create into DB
          log('Database entries created.', logger.SUCCESS);
          svResults = result;
          let mavisProducts = _.map(result, 'mavis_product_id');

          if(mavisProducts) {
            mavis.addMavisSummary(report, moduleOptions.config.MAVISSummary, mavisProducts).then(
              (mavisResults) => {
                // Done!
                deferred.resolve({loader: 'structuralVariants', result: true, data: svResults});
              },
              (mavisErr) => {
                log('Unable to add MAVIS summary for structural variants');
                new Error('Unable to add MAVIS summary for structural variants');
                deferred.reject({loader: 'structuralVariants', message: 'Unable to add MAVIS summary for structural variants'});
              }
            )
          } else {
            // Done!
            deferred.resolve({loader: 'structuralVariants', result: true, data: svResults});
          }

        },
        // Problem creating DB entries
        (err) => {
          log('Unable to create database entries.', logger.ERROR);
          new Error('Unable to create structural variants database entries.');
          deferred.reject({loader: 'structuralVariants', message: 'Unable to create structural variants database entries.', result: false});
        }
      );

    },
    (error) => {

      console.log(error);
      log('Unable to process structrual variant file', logger.ERROR);
      deferred.reject({loader: 'structuralVariants', message: 'Unable to process a structural variants file: ' + error.message, result: false});

    });

  return deferred.promise;
};
