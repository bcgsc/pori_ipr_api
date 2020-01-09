const promisfy = require('util').promisify;
const fs = require('fs');
const glob = require('glob');
const im = require('imagemagick');
const {spawn, execSync} = require('child_process');
const db = require('../models');
const images = require('../../config/images.json');

const logger = require('../log');


const imageIdentify = promisfy(im.identify);

const MAX_SUBPLOT_IMAGE_WIDTH = 600;

// Image Path
let imagePath;

/**
 * Process all Expression Density Images
 *
 * @param {object} report - Report model object
 * @param {string} img - Path to image file
 *
 * @returns {Promise.<boolean>} - Returns true of the process was a success
 */
const processExpDensityImages = async (report, img) => {
  const geneName = img.split('/').pop().split('.').shift();
  /* This returns a Uint8Array type which needs to be converted to a string */
  const imgData = execSync(`convert "${img}" -resize 450x450 PNG:- | base64`).toString();

  // Write to DB
  // Add to database
  await db.models.imageData.create({
    pog_id: report.pog_id,
    report_id: report.id,
    format: 'PNG',
    filename: img.split('/').pop(),
    key: `expDensity.${geneName}`,
    data: imgData,
  });

  logger.info(`Loaded image: expDensity.${geneName}`);
  return true;
};

/**
 * Load in the expression denisty images
 *
 * @param {object} report - Report model object
 *
 * @returns {Promise.<object>} - Returns object stating that the load was a success
 */
const loadExpressionDensity = async (report) => {
  const expDenProm = [];
  const files = glob.sync(`${imagePath}/expr_density/*.png`);

  files.forEach((file) => {
    if (!file.includes('expr_histo_legend.png')) {
      expDenProm.push(processExpDensityImages(report, file));
    }
  });

  await Promise.all(expDenProm);
  logger.info('Finished processing Expression Density images');

  return {expDensityImages: true};
};

/**
 * Process all Subtype Plot Images
 *
 * @param {object} report - Report model object
 * @param {string} img - Path to image file
 *
 * @returns {Promise.<boolean>} - Returns true if processing subtype plot images was a success
 */
const processSubtypePlotImages = async (report, img) => {
  const filename = img.split('/').pop();
  // remove .png extension from filename
  const imageString = filename.replace(/\.[^/.]+$/, '');

  // pediatric subtype plots are sized similarly to expression charts - all others are normal subtype plot size
  let imageSize;
  if (imageString.toLowerCase().startsWith('ped')) {
    imageSize = '1000x900';
  } else {
    // Get height and width of image and store at 25% of those values
    const {height, width} = await imageIdentify(img);

    if (width > MAX_SUBPLOT_IMAGE_WIDTH) {
      const ratio = width / MAX_SUBPLOT_IMAGE_WIDTH;
      const newHeight = Math.round(height / ratio);
      imageSize = `${MAX_SUBPLOT_IMAGE_WIDTH}x${newHeight}`;
    } else {
      imageSize = `${width}x${height}`;
    }
  }

  /* This returns a Uint8Array type which needs to be converted to a string */
  const imgData = execSync(`convert "${img}" -resize ${imageSize} PNG:- | base64`).toString();

  // Write to DB
  // Add to database
  await db.models.imageData.create({
    pog_id: report.pog_id,
    report_id: report.id,
    format: 'PNG',
    filename,
    key: `subtypePlot.${imageString}`,
    data: imgData,
  });

  logger.info(`Loaded image: subtypePlot.${imageString}`);
  return true;
};

// Load in the subtype plot images
const loadSubtypePlot = async (report) => {
  const files = glob.sync(`${imagePath}/subtype_plot_image/*.png`);

  const subtypeProm = files.map((file) => {
    // Read in each file, and put into DB.
    return processSubtypePlotImages(report, file);
  });

  await Promise.all(subtypeProm);
  logger.info('Finished processing Subtype Plot images');

  return {subtypePlotImages: true};
};

/**
 * Process Mutation Summary Images
 *
 * @param {object} report - Report model object
 * @param {string} file - Path to file
 *
 * @returns {Promise.<boolean>} - Returns true if the image was added to db successfully
 */
const processSummaryImage = async (report, file) => {
  /* This returns a Uint8Array type which needs to be converted to a string */
  const imgData = execSync(`convert "${file}" -resize 560x151 PNG:- | base64`).toString();
  // Convert pre genomicReport.py v5.0.0 summary image names to updated format
  const legacyNames = {
    bar_indel: 'barplot_indel',
    bar_snv: 'barplot_snv',
    bar_sv: 'barplot_sv',
    snv: 'density_plot_snv',
    sv: 'density_plot_sv',
    indel: 'density_plot_indel',
  };

  const filename = file.split('/').pop();
  let imageString = filename.substring(17, filename.lastIndexOf('.png'));

  /* Legacy Name Check */
  if (imageString in legacyNames) {
    logger.info(`#### Found legacy name, renaming ${imageString} to ${legacyNames[imageString]}`);
    imageString = legacyNames[imageString];
  }

  // Write result to DB
  await db.models.imageData.create({
    pog_id: report.pog_id,
    report_id: report.id,
    format: 'PNG',
    filename,
    key: `mutation_summary.${imageString}`,
    data: imgData,
  });
  logger.info(`Loaded image: mutation_summary.${imageString}`);

  return true;
};

/**
 * Load all mutation summary images
 *
 * @param {object} report - Report model object
 *
 * @returns {Promise.<object>} - Returns status of processed summary images
 */
const loadSummaryImage = async (report) => {
  const files = glob.sync(`${imagePath}/mut_summary_image/*.png`);
  const promises = files.map((file) => {
    return processSummaryImage(report, file);
  });

  await Promise.all(promises);
  logger.info('Finished loading all mutation summary images');

  return {loader: 'mutation_summary', status: true};
};

/**
 * Read, Resize, and Insert Image Data
 *
 * @param {object} report - Report model object
 * @param {object} image - Object containing image information
 *
 * @returns {Promise.<boolean>} - Returns true if processing image was successfull
 */
const processImage = async (report, image) => {
  let imgData = '';

  // Call Resize
  const format = image.format || 'PNG';
  const process = spawn('convert', [`${imagePath}${image.file}`, '-resize', `${image.dimensions.w}x${image.dimensions.h}`, `${format}:-`]);
  const base = spawn('base64');
  process.stdout.pipe(base.stdin);

  // On data, chunk
  base.stdout.on('data', (res) => {
    imgData += res;
  });

  base.stderr.on('data', (err) => {
    throw new Error(`ImageMagick failed to convert: ${image.file}`);
  });

  // Done executing
  base.on('close', async () => {
    // Write to DB
    // Add to database
    await db.models.imageData.create({
      pog_id: report.pog_id,
      report_id: report.id,
      format,
      filename: image.file.split('/').pop(),
      key: image.name,
      data: imgData,
    });

    logger.info(`Loaded image: ${image.name}`);
    return true;
  });
};

/**
 * Parse Image Data
 *
 * Process POG Report images, and store in database
 *
 * @param {object} report - Report model object
 * @param {object} dir - Base directory
 *
 * @returns {Promise.<object>} - Returns an object with the results of all the loaded images
 */
module.exports = async (report, dir) => {
  // Set Image Path
  imagePath = `${dir}/images`;
  const promises = [];
  const errors = [];

  images.forEach((image) => {
    // Check that image exists
    if (!fs.existsSync(`${imagePath}${image.file}`)) {
      if (image.optional) {
        return;
      }
      logger.error(`Failed to find image file: ${image.name}`);
      errors.push(`missing image: ${image.name}`);
    } else {
      promises.push(processImage(report, image));
    }
  });

  const results = [];

  const tryLoader = async (loaderPromise) => {
    try {
      const result = await loaderPromise;
      results.push(result);
    } catch (err) {
      logger.error(err);
      errors.push(err);
    }
  };

  await Promise.all(promises.map(tryLoader));

  await Promise.all([loadExpressionDensity(report), loadSummaryImage(report), loadSubtypePlot(report)].map(tryLoader));

  logger.info('Image loading complete');
  // must not block loading all images if one image fails so throw the error here instead
  if (errors.length > 1) {
    throw new Error(`Error(s) loading image(s): ${errors.map((err) => { return err.toString(); }).join(';')}`);
  }

  return {
    loader: 'images', result: true, outcome: results,
  };
};
