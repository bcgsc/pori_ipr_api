"use strict";

// Dependencies
let db = require(process.cwd() + '/app/models'),
  fs = require('fs'),
  parse = require('csv-parse'),
  remapKeys = require(process.cwd() + '/app/libs/remapKeys'),
  _ = require('lodash'),
  Q = require('q'),
  nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/config.json'});

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
let parseStructuralVariantFile = (POG, structuralVariationFile, variantType, log) => {

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
        deferred.reject({reason: 'parseCSVFail'});
      }

      // Remap results
      let entries = remapKeys(result, nconf.get('columnMapping:structuralVariation:sv'));

      // Add new values for DB
      entries.forEach((v, k) => {
        // Map needed DB column values
        entries[k].pog_id = POG.id;
        entries[k].svVariant = variantType;

        if(v.svg !== 'na' && v.svg !== '') {
          // Load in SVG !! SYNC-Block
          entries[k].svg = fs.readFileSync(v.svg, "utf-8");

          // Load in Text File !! SYNC-Block
          entries[k].svgTitle = fs.readFileSync(v.svgTitle, "utf-8");
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
    deferred.reject({reason: 'sourceFileNotFound'});
  });

  return deferred.promise;

};

/*
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
 * @param object POG - POG model object
 * @param object options - Currently no options defined on this import
 *
 */
module.exports = (POG, dir, logger) => {

  baseDir = dir;

  // Create promise
  let deferred = Q.defer();

  // Setup Logger
  let log = logger.loader(POG.POGID, 'SV.StructuralVariants');

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
    promises.push(parseStructuralVariantFile(POG, input.file, input.type, log));
  });

  // Wait for all promises to be resolved
  Q.all(promises)
    .then((results) => {
      // Log progress
      log('Structural Variations: ' + _.flattenDepth(results, 2).length);

      // Load into Database
      db.models.sv.bulkCreate(_.flattenDepth(results, 2)).then(
        (result) => {

          // Successful create into DB
          log('Database entries created.', logger.SUCCESS);

          // Done!
          deferred.resolve({smallMutations: true});

        },
        // Problem creating DB entries
        (err) => {
          log('Unable to create database entries.', logger.ERROR);
          new Error('Unable to create structural variants database entries.');
          deferred.reject('Unable to create structural variants database entries.');
        }
      );

    });

  return deferred.promise;
};
