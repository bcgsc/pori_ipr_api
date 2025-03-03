const logger = require('../../log');
const db = require('../../models');
const {processImage} = require('../../libs/image');
const {IMAGE_SIZE_LIMIT} = require('../../constants');

const DEFAULT_FORMAT = 'PNG';

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

  const config = {format: DEFAULT_FORMAT, size: IMAGE_SIZE_LIMIT};

  try {
    const imageData = await processImage(image, config.size, config.format);

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
