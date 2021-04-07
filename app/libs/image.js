const sharp = require('sharp');
const db = require('../models');


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
const processImage = async (image, width, height, format = 'png') => {
  const imageData = await sharp(image)
    .resize(width, height)
    .toFormat(format.toLowerCase())
    .toBuffer();

  return imageData.toString('base64');
};


/**
 * Resize, reformat and upload image to images table
 *
 * @param {object} image - All image data for upload
 * @param {Buffer|string} image.data - Binary image data or absolute file path
 * @param {string} image.filename - Name of the image file
 * @param {string} image.format - Format of the image (i.e png)
 * @param {integer} image.height - Height of resized image (px)
 * @param {integer} image.width - Width of resized image (px)
 * @param {string} image.type - Type of image uploading (i.e Logo, header)
 * @param {object} options - Additional options for create
 * @param {object} options.transactioon - Transaction to run create under
 * @returns {Promise<object>} - Returns the newly uploaded image data
 */
const uploadImage = async (image, options = {}) => {
  const {
    data, width, height, filename, format, type,
  } = image;

  // Resize image
  const imageData = await processImage(data, width, height, format.replace('image/', ''));

  // Upload image data
  return db.models.image.create({
    data: imageData,
    filename,
    format,
    type,
  }, options);
};

/**
 * Delete image from images table
 *
 * @param {string} ident - Ident of image to delete
 * @param {boolean} force - Whether it is a hard delete or not
 * @param {object} transaction - Transaction to run delete under
 * @returns {Promise<object>} - Returns the newly updated image data
 */
const deleteImage = async (ident, force = false, transaction) => {
  const image = await db.models.image.findOne({where: {ident}});

  if (!image) {
    throw new Error('Image doesn\'t exist');
  }

  return image.destroy({where: {ident}, force, transaction});
};


module.exports = {
  processImage,
  uploadImage,
  deleteImage,
};
