const {spawn} = require('child_process');
const path = require('path');
const fs = require('fs');

const logger = require('../../log');
const db = require('../../models');

const DEFAULT_WIDTH = 500;
const DEFAULT_HEIGHT = 500;
const DEFAULT_FORMAT = 'PNG';

// takes first pattern match (order matters)
const IMAGES_CONFIG = [
  {
    pattern: 'subtypePlot\\.ped_\\S+',
    width: 420,
    height: 900,
    format: 'PNG',
  },
  {
    pattern: 'subtypePlot\\.\\S+',
    width: 600,
    height: 375,
    format: 'PNG',
  },
  {
    pattern: '(cnv|loh)\\.[1]',
    height: 166,
    width: 1000,
    format: 'PNG',
  },
  {
    pattern: '(cnv|loh)\\.[2345]',
    height: 161,
    width: 1000,
    format: 'PNG',
  },
  {
    pattern: 'mutation_summary\\.(barplot|density|legend)_(sv|snv|indel|snv_indel)(\\.\\w+)?',
    width: 560,
    height: 151,
    format: 'PNG',
  },
  {
    pattern: 'cnvLoh.circos',
    width: 1000,
    height: 1000,
    format: 'JPG',
  },
  {
    pattern: 'mutSignature.corPcors',
    width: 1000,
    height: 2000,
    format: 'JPG',
  },
  {
    pattern: 'mutSignature.snvsAllStrelka',
    width: 480,
    height: 480,
    format: 'PNG',
  },
  {
    pattern: 'circosSv\\.(genome|transcriptome)',
    width: 1001,
    height: 900,
    format: 'PNG',
  },
  {
    pattern: 'expDensity\\.\\S+',
    width: 450,
    height: 450,
    format: 'PNG',
  },
  {
    pattern: 'expression\\.chart',
    width: 1000,
    height: 900,
    format: 'JPG',
  },
  {
    pattern: 'expression\\.legend',
    width: 500,
    height: 500,
    format: 'JPG',
  },
  {
    pattern: 'microbial\\.circos\\.(genome|transcriptome)',
    width: 900,
    height: 900,
    format: 'PNG',
  },
];

/**
 * Read, Resize, and Insert Image Data
 *
 * @param {string} imagePath absolute path to the image file
 * @param {Number} width width of the final image in pixels
 * @param {Number} height height of the final image in pixels
 * @param {string} format format of the output image (default: PNG)
 *
 * @returns {Promise.<string>} Returns the image data
 * @throws {Promise.<Error>} if the image fails to load/read
 */
const processImage = (imagePath, width, height, format = 'PNG') => {
  return new Promise((resolve, reject) => {
    let imageData = '';

    // Call Resize
    const process = spawn('convert', [`${imagePath}`, '-resize', `${width}x${height}`, `${format}:-`]);
    const base = spawn('base64');
    process.stdout.pipe(base.stdin);

    // On data, chunk
    base.stdout.on('data', (res) => {
      imageData += res;
    });

    base.stderr.on('data', (err) => {
      reject(err);
    });

    // Done executing
    base.on('close', () => {
      if (imageData) {
        resolve(imageData);
      } else {
        reject(new Error(`empty image for path: ${imagePath}`));
      }
    });
  });
};


/**
 * Throws an error if a given image path does not exist
 *
 * @param {string} imagePath the absolute path to the image file
 *
 * @throws {Promise.<Error>} if the image path does not exist
 * @returns {Promise} if the image exists
 */
const imagePathExists = (imagePath) => {
  return new Promise((resolve, reject) => {
    fs.access(imagePath, fs.F_OK, (err) => {
      if (err) {
        reject(err);
      } else {
        // file exists
        resolve();
      }
    });
  });
};


/**
 * @param {Number} reportId - The primary key for the report these images belong to (to create FK relationship)
 * @param {string} key - The image key, defines what type of image is being loaded
 * @param {string} imagePath - The absolute path to the image file
 * @param {object} options - An object containing additional image upload options
 *
 * @property {string} options.caption - An optional caption for the image
 * @property {string} options.title - An optional title for the image
 *
 * @returns {Promise} the image has been loaded successfully
 * @throws {Promise.<Error>} the image does not exist or did not load correctly
 */
const loadImage = async (reportId, key, imagePath, options = {}) => {
  logger.verbose(`loading (${key}) image: ${imagePath}`);

  let config;

  for (const {pattern, ...conf} of IMAGES_CONFIG) {
    const regexp = new RegExp(`^${pattern}$`);
    if (regexp.exec(key)) {
      config = conf;
      break;
    }
  }

  if (!config) {
    logger.warn(`no format/size configuration for ${key}. Using default values`);
    config = {format: DEFAULT_FORMAT, height: DEFAULT_HEIGHT, width: DEFAULT_WIDTH};
  }

  try {
    await imagePathExists(imagePath);
  } catch (err) {
    logger.error(`file not found: ${imagePath}`);
    throw err;
  }

  const imageData = await processImage(imagePath, config.width, config.height, config.format);
  await db.models.imageData.create({
    reportId,
    format: config.format,
    filename: path.basename(imagePath),
    key,
    data: imageData,
    caption: options.caption,
    title: options.title,
  });
};

module.exports = {loadImage};
