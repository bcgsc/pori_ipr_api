const sharp = require('sharp');
const db = require('../models');

/**
 * Resize and upload image to database
 *
 * @param {object} image - All image data for upload
 * @param {Buffer} image.data - Binary image data
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
  const buffImage = await sharp(data).resize({width, height}).toBuffer();
  // Upload image data
  const result = await db.models.image.create({
    data: buffImage.toString('base64'),
    filename,
    format,
    type,
  }, options);
  return result;
};

/**
 * Resize and update image data in the database
 *
 * @param {string} ident - Ident of image to update
 * @param {object} image - All image data for update
 * @param {Buffer} image.data - Binary image data
 * @param {string} image.filename - Name of the image file
 * @param {string} image.format - Format of the image (i.e png)
 * @param {integer} image.height - Height of resized image (px)
 * @param {integer} image.width - Width of resized image (px)
 * @param {string} image.type - Type of image (i.e Logo, header)
 * @param {object} options - Additional options for update
 * @param {object} options.transaction - Transaction to run update under
 * @returns {Promise<object>} - Returns the newly updated image data
 */
const updateImage = async (ident, image, options = {}) => {
  const {
    data, filename, format, type, width, height,
  } = image;

  const oldImage = await db.models.image.findOne({where: {ident}});

  if (!oldImage) {
    throw new Error('Image doesn\'t exist');
  }

  // Resize image
  const buffImage = await sharp(data).resize({width, height}).toBuffer();

  // Update image data
  const result = await oldImage.update({
    data: buffImage.toString('base64'),
    filename,
    format,
    type,
  }, options);
  return result;
};

/**
 * Delete image from images database
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
  uploadImage,
  updateImage,
  deleteImage,
};
