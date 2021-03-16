const {spawn} = require('child_process');
const {PassThrough} = require('stream');

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
    pattern: 'mutationBurden\\.(barplot|density|legend)_(sv|snv|indel|snv_indel)\\.(primary|secondary|tertiary|quaternary)',
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
    pattern: 'mutSignature.corPcors\\.(dbs|indels|sbs)',
    width: 1000,
    height: 2000,
    format: 'JPG',
  },
  {
    pattern: 'mutSignature.barplot\\.sbs',
    width: 480,
    height: 480,
    format: 'PNG',
  },
  {
    pattern: 'mutSignature.barplot\\.(dbs|indels)',
    width: 2000,
    height: 1000,
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
  {
    pattern: 'cibersort\\.(cd8_positive|combined)_t-cell_scatter',
    width: 1020,
    height: 1020,
    format: 'PNG',
  },
  {
    pattern: 'mixcr\\.circos_trb_vj_gene_usage',
    width: 1000,
    height: 1000,
    format: 'PNG',
  },
  {
    pattern: 'mixcr\\.dominance_vs_alpha_beta_t-cells_scatter',
    width: 640,
    height: 480,
    format: 'PNG',
  },
  {
    pattern: 'scpPlot',
    width: 1400,
    height: 900,
    format: 'PNG',
  },
  {
    pattern: 'msi.scatter',
    width: 1000,
    height: 1000,
    format: 'PNG',
  },
  {
    pattern: 'pathwayAnalysis.legend',
    width: 990,
    height: 765,
    format: 'PNG',
  },
];

/**
 * Resize, reformat and return base64 representation of image.
 *
 * @param {Buffer|string} image - Buffer containing image data or the absolute path to an image file
 * @param {number} width - Width of the final image in pixels
 * @param {number} height - Height of the final image in pixels
 * @param {string} format - Format of the output image (default: PNG)
 *
 * @returns {Promise<string>} - Returns base64 representation of image
 * @throws {Promise<Error>} - File doesn't exist, incorrect permissions, etc.
 */
const processImage = (image, width, height, format = 'PNG') => {
  return new Promise((resolve, reject) => {
    let imageData = '';

    // Resize and reformat image
    const convert = spawn('convert', [`${Buffer.isBuffer(image) ? '-' : image}`, '-resize', `${width}x${height}`, `${format}:-`]);

    if (Buffer.isBuffer(image)) {
      const stream = PassThrough();
      stream.end(image);
      stream.pipe(convert.stdin);
    }

    const base = spawn('base64');
    convert.stdout.pipe(base.stdin);

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
        reject(new Error('No image data found'));
      }
    });
  });
};


/**
 * @param {Number} reportId - The primary key for the report these images belong to (to create FK relationship)
 * @param {string} key - The image key, defines what type of image is being loaded
 * @param {Buffer|string} image - Buffer containing image data or the absolute path to the image file
 * @param {object} options - An object containing additional image upload options
 *
 * @property {string} options.filename - An optional filename for the image
 * @property {string} options.caption - An optional caption for the image
 * @property {string} options.title - An optional title for the image
 * @property {object} options.transaction - An optional transaction to run the create under
 *
 * @returns {Promise<object>} - Returns the created imageData db entry
 * @throws {Promise<Error>} - Something goes wrong with image processing and saving entry
 */
const loadImage = async (reportId, key, image, options = {}) => {
  logger.verbose(`Loading (${key}) image`);

  let config;
  for (const {pattern, ...conf} of IMAGES_CONFIG) {
    const regexp = new RegExp(`^${pattern}$`);
    if (regexp.exec(key)) {
      config = conf;
      break;
    }
  }

  if (!config) {
    logger.warn(`No format/size configuration for ${key}. Using default values`);
    config = {format: DEFAULT_FORMAT, height: DEFAULT_HEIGHT, width: DEFAULT_WIDTH};
  }


  try {
    const imageData = await processImage(image, config.width, config.height, config.format);

    return db.models.imageData.create({
      reportId,
      format: config.format,
      filename: options.filename,
      key,
      data: imageData,
      caption: options.caption,
      title: options.title,
    }, {transaction: options.transaction});
  } catch (error) {
    logger.error(error);
    throw error;
  }
};

module.exports = {
  loadImage,
  processImage,
};
