const {spawn} = require('child_process');
const path = require('path');
const fs = require('fs');

const logger = require('../../log');
const db = require('../../models');

const DEFAULT_WIDTH = 500;
const DEFAULT_HEIGHT = 500;
const DEFAULT_FORMAT = 'PNG';

const IMAGES_CONFIG = {
  'subtypePlot\\.\\S+': 'TODO',
  '(cnv|loh)\\.[1]': {height: 166, width: 1000, format: 'PNG'},
  '(cnv|loh)\\.[2345]': {height: 161, width: 1000, format: 'PNG'},
  'mutation_summary\\.(barplot|density|legend)_(sv|snv|indel|snv_indel)(\\.\\w+)?': {
    width: 560, height: 151, format: 'PNG',
  },
  'cnvLoh.circos': {width: 1000, height: 1000, format: 'JPG'},
  'mutSignature.corPcors': {width: 1000, height: 2000, format: 'JPG'},
  'mutSignature.snvsAllStrelka': {width: 480, height: 480, format: 'PNG'},
  'circosSv\\.(genome|transcriptome)': {
    width: 1001,
    height: 900,
    format: 'PNG',
  },
  'expDensity\\.\\S+': {
    width: 450, height: 450, format: 'PNG',
  },
  'expression\\.chart': {width: 1000, height: 900, format: 'JPG'},
  'expression\\.legend': {width: 500, height: 500, format: 'JPG'},
  'microbial\\.circos\\.(genome|transcriptome)': {
    width: 900, height: 900, format: 'PNG',
  },
};

/**
 * Read, Resize, and Insert Image Data
 *
 * @param {string} imagePath - absolute path to the image file
 * @param {Number} width - width of the final image in pixels
 * @param {Number} height - heigh of the final image in pixels
 * @param {string} format - format of the output image (default: PNG)
 *
 * @returns {Promise.<boolean>} - Returns true if processing image was successfull
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
      resolve(imageData);
    });
  });
};


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


const loadImage = async (reportId, key, imagePath) => {
  logger.verbose(`loading (${key}) image: ${imagePath}`);

  let config = IMAGES_CONFIG[key];

  if (!config) {
    for (const pattern of Object.keys(IMAGES_CONFIG)) {
      const regexp = new RegExp(`^${pattern}$`);
      if (regexp.exec(key)) {
        config = IMAGES_CONFIG[pattern];
        break;
      }
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
    report_id: reportId,
    format: config.format,
    filename: path.basename(imagePath),
    key,
    data: imageData,
  });
};

module.exports = {loadImage};
