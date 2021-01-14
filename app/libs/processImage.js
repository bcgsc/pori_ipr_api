const jimp = require('jimp');

let conf;

/**
 * Get MIME type for a specific image format
 *
 * @param {string} format - Image format (i.e PNG, JPG)
 * @returns {string} - Returns the MIME type for the provided format
 */
const getMimeType = (format) => {
  switch (format.toLowerCase()) {
    case 'jpg':
      return jimp.MIME_JPEG;
    case 'bmp':
      return jimp.MIME_BMP;
    default:
      return jimp.MIME_PNG;
  }
};

/**
 * Process an image (resize, reformat) and return
 * the base64 version of the altered image
 *
 * @param {Buffer | string} imageData - Buffer containing supported image data or the absolute path to the image file
 * @param {object} config - An object containing alteration values
 * @property {integer} config.width - New width to resize image to
 * @property {integer} config.height - New height to resize image to
 * @property {string} config.format - New format to change image to ('jpg', 'png')
 * @returns {string} - Returns base64 version of the altered image
 */
const processImage = async (imageData, config) => {
  try {
    // Read in image data
    const buffImage = await jimp.read(imageData);
    // Resize image
    await buffImage.resize(config.width, config.height);
    // Get format to convert image to
    const mimeType = getMimeType(config.format);
    // Get base64 version of image
    const imageString = await buffImage.getBase64Async(mimeType);
    // Send base64 image string back and exit thread
    process.send(imageString.split(',')[1], () => {
      process.exit();
    });
  } catch (error) {
    process.send({error: error.message || error}, () => {
      process.exit();
    });
  }
};

process.on('message', (msg) => {
  if (msg.imageData) {
    processImage(msg.imageData, msg.config);
  } else {
    conf = msg;
  }
});

process.stdin.on('data', (data) => {
  processImage(data, conf);
});
