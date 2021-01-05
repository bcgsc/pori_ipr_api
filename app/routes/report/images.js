const sharp = require('sharp');

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
];


/**
 * @param {Number} reportId - The primary key for the report these images belong to (to create FK relationship)
 * @param {string} key - The image key, defines what type of image is being loaded
 * @param {Buffer | string} imageData - Buffer containing supported image data or the absolute path to the image file
 * @param {string} filename - Name of image file
 * @param {object} options - An object containing additional image upload options
 *
 * @property {string} options.caption - An optional caption for the image
 * @property {string} options.title - An optional title for the image
 *
 * @returns {Promise} the image has been loaded successfully
 * @throws {Promise.<Error>} the image does not exist or did not load correctly
 */
const uploadReportImage = async (reportId, key, imageData, filename, options = {}) => {
  logger.verbose(`loading (${key}) image: ${filename}`);

  // Get image configuration options (height, width, etc.)
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

  // Resize and reformat image based on config
  const image = await sharp(imageData)
    .resize({height: config.height, width: config.width})
    .toFormat(config.format.toLowerCase())
    .toBuffer();

  // Save image to db
  await db.models.imageData.create({
    reportId,
    format: config.format,
    filename,
    key,
    data: image.toString('base64'),
    caption: options.caption,
    title: options.title,
  });
};

module.exports = {uploadReportImage};
