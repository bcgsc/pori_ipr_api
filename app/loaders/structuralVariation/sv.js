const fs = require('fs');
const _ = require('lodash');
const parse = require('csv-parse/lib/sync');
const nconf = require('nconf').argv().env().file({file: '../../../config/columnMaps.json'});
const db = require('../../models');
const remapKeys = require('../../libs/remapKeys');
const mavis = require('../../libs/mavis');

const {logger} = process;
let baseDir;

/**
 * Parse Structural Variations Mutations File
 *
 * @param {object} report - POG model object
 * @param {string} structuralVariationFile - Name of CSV file for given small mutation type
 * @param {string} variantType - variantType of these entries (clinical, nostic, biological, fusionOmicSupport)
 *
 * @returns {Promise.<Array.<object>>} - Returns structural variations from parsed file
 */
const parseStructuralVariantFile = async (report, structuralVariationFile, variantType) => {
  // Check that the provided alterationType is valid according to the schema
  if (!db.models.sv.rawAttributes.svVariant.values.includes(variantType)) {
    throw new Error(`Invalid variantType. Given: ${variantType}`);
  }

  // First parse in therapeutic
  const output = fs.readFileSync(`${baseDir}/JReport_CSV_ODF/${structuralVariationFile}`);

  // Parse file!
  const result = parse(output, {delimiter: ',', columns: true});

  // Remap results
  const entries = remapKeys(result, nconf.get('structuralVariation:sv'));

  // Add new values for DB
  entries.forEach((entry) => {
    // Map needed DB column values
    entry.pog_id = report.pog_id;
    entry.pog_report_id = report.id;
    entry.svVariant = variantType;
    entry.mavis_product_id = entry.MAVIS_product_id.split(';')[0];

    if (entry.svg !== 'na' && entry.svg !== '') {
      // Load in SVG !! SYNC-Block
      entry.svg = fs.readFileSync(entry.svg, {encoding: 'utf-8'});

      // Load in Text File !! SYNC-Block
      entry.svgTitle = fs.readFileSync(entry.svgTitle, {encoding: 'utf-8'});
    } else {
      // Set null values
      entry.svg = null;
      entry.svgTitle = null;
      entry.name = null;
      entry.frame = null;
      entry.ctermGene = null;
      entry.ntermGene = null;
      entry.ctermTranscript = null;
      entry.ntermTranscript = null;
    }
  });

  // Log progress
  logger.info(`Parsed .csv for: ${variantType}`);

  return entries;
};

/**
 * Structural Variation - Structural Variants Loader
 *
 * Load values for "Structural Variation: Genomic Details"
 * sources:
 *  - sv_fusion_biol.csv          -Biological
 *  - sv_fusion_clin_rel.csv      -Clinical
 *  - sv_fusion_prog_diag.csv     -Nostic
 *  - sv_fusion_transcribed.csv   -fusionOmicSupport
 *
 * Create DB entries for Small Mutations. Parse in CSV values, mutate, insert.
 *
 * @param {object} report - POG report model object
 * @param {string} dir - Root directory
 * @param {object} moduleOptions - Options to configure mavis summary
 *
 * @returns {Promise.<object>} - Returns result of loading structural variants into db
 */
module.exports = async (report, dir, moduleOptions) => {
  baseDir = dir;

  // Small Mutations to be processed
  const sources = [
    {file: 'sv_fusion_biol.csv', type: 'biological'},
    {file: 'sv_fusion_clin_rel.csv', type: 'clinical'},
    {file: 'sv_fusion_prog_diag.csv', type: 'nostic'},
    {file: 'sv_fusion_transcribed.csv', type: 'fusionOmicSupport'},
    {file: 'sv_unchar.csv', type: 'uncharacterized'},
  ];

  // Loop over sources and collect promises
  const promises = sources.map((input) => {
    return parseStructuralVariantFile(report, input.file, input.type);
  });

  // Wait for all promises to be resolved
  const results = await Promise.all(promises);
  const flatResults = _.flattenDepth(results, 2);

  // Log progress
  logger.info(`Structural Variations: ${flatResults.length}`);

  // Load into Database
  const svLoadResult = await db.models.sv.bulkCreate(flatResults);

  // Successful create into DB
  logger.info('Database entries created.');

  const mavisProducts = _.map(svLoadResult, 'mavis_product_id');

  if (mavisProducts && moduleOptions.config.MAVISSummary) {
    await mavis.addMavisSummary(report, moduleOptions.config.MAVISSummary, mavisProducts);
    logger.info('MAVIS summaries created.');
  }
  return {loader: 'structuralVariants', result: true, data: svLoadResult};
};
