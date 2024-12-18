const logger = require('../../log');
const db = require('../../models');
const {processImage} = require('../../libs/image');

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
    pattern: 'expDensity.histogram.\\S+',
    width: 450,
    height: 450,
    format: 'PNG',
  },
  {
    pattern: 'expDensity.violin.\\S+',
    width: 825,
    height: 1965,
    format: 'PNG',
  },
  {
    pattern: 'expression\\.chart',
    width: 800,
    height: 1500,
    format: 'PNG',
  },
  {
    pattern: 'expression\\.legend',
    width: 800,
    height: 400,
    format: 'PNG',
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
  {
    pattern: 'expression.spearman.tcga',
    width: 1100,
    height: 3000,
    format: 'PNG',
  },
  {
    pattern: 'expression.spearman.gtex',
    width: 1100,
    height: 4050,
    format: 'PNG',
  },
  {
    pattern: 'expression.spearman.cser',
    width: 1100,
    height: 1125,
    format: 'PNG',
  },
  {
    pattern: 'expression.spearman.hartwig',
    width: 1100,
    height: 1500,
    format: 'PNG',
  },
  {
    pattern: 'expression.spearman.pediatric',
    width: 1100,
    height: 2775,
    format: 'PNG',
  },
  {
    pattern: 'expression.spearman.target',
    width: 640,
    height: 480,
    format: 'PNG',
  },
  {
    pattern: 'expression.spearman.brca\\.(molecular|receptor)',
    width: 1100,
    height: 450,
    format: 'PNG',
  },
  {
    pattern: 'copyNumberChr(1|2)',
    width: 1625,
    height: 875,
    format: 'PNG',
  },
  {
    pattern: 'copyNumberChr(3|4|5)',
    width: 1300,
    height: 875,
    format: 'PNG',
  },
  {
    pattern: 'copyNumberChr(6|7|X)',
    width: 1150,
    height: 875,
    format: 'PNG',
  },
  {
    pattern: 'copyNumberChr(8|9)',
    width: 1100,
    height: 875,
    format: 'PNG',
  },
  {
    pattern: 'copyNumberChr(10|11|12|13|14)',
    width: 1000,
    height: 1000,
    format: 'PNG',
  },
  {
    pattern: 'copyNumberChr15',
    width: 1000,
    height: 1150,
    format: 'PNG',
  },
  {
    pattern: 'copyNumberChr(16|17|18)',
    width: 900,
    height: 1150,
    format: 'PNG',
  },
  {
    pattern: 'copyNumberChr(19|20|Y)',
    width: 700,
    height: 1150,
    format: 'PNG',
  },
  {
    pattern: 'copyNumberChr(21|22)',
    width: 550,
    height: 1150,
    format: 'PNG',
  },
  {
    pattern: 'copyNumberLegend',
    width: 300,
    height: 1150,
    format: 'PNG',
  },
];

/**
 * Resize, reformat and upload a report image to the reports_image_data table
 *
 * @param {Number} reportId - The primary key for the report this image belong to (to create FK relationship)
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
const uploadReportImage = async (reportId, key, image, options = {}) => {
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
      width: config.width,
      height: config.height,
      category: options.category,
    }, {transaction: options.transaction});
  } catch (error) {
    logger.error(`Error processing report image ${options.filename} ${error}`);
    throw new Error(`Error processing report image ${options.filename} ${error}`);
  }
};

module.exports = {
  uploadReportImage,
};
