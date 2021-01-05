const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');

const db = require('../../../models');
const logger = require('../../../log');
const {uploadReportImage} = require('../images');
const {VALID_IMAGE_KEY_PATTERN} = require('../../../constants');

const router = express.Router({mergeParams: true});

// Maximum number of images per upload
const MAXIMUM_NUM_IMAGES = 20;
// The size of 1 MB, which is 1048576 bytes
const ONE_MB = 1048576;
// Maximum image size (50 MB)
const MAXIMUM_IMG_SIZE = ONE_MB * 50;


// Route for adding an image
router.route('/')
  .post(async (req, res) => {
    // Check that image files were uploaded
    if (!req.files || Object.keys(req.files).length === 0) {
      logger.error('No attached images to upload');
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'No attached images to upload'}});
    }

    // Check that upload doesn't exceed maximum number of images allowed
    if (Object.keys(req.files).length > MAXIMUM_NUM_IMAGES) {
      logger.error(`Tried to upload more images than the maximum allowed per request. Max: ${MAXIMUM_NUM_IMAGES}`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: `You tried to upload more than the allowed max number of images per request. Max: ${MAXIMUM_NUM_IMAGES}`}});
    }

    // Check for valid and duplicate keys
    const keys = [];
    const pattern = new RegExp(VALID_IMAGE_KEY_PATTERN);

    for (let [key, value] of Object.entries(req.files)) {
      key = key.trim();

      // Check if key is valid
      if (!pattern.test(key)) {
        logger.error(`Invalid key: ${key}`);
        return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: `Invalid key: ${key}`}});
      }

      // Check if key is a duplicate
      if (keys.includes(key) || Array.isArray(value)) {
        logger.error(`Duplicate keys are not allowed. Duplicate key: ${key}`);
        return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: `Duplicate keys are not allowed. Duplicate key: ${key}`}});
      }

      keys.push(key);
    }

    try {
      const results = await Promise.all(Object.entries(req.files).map(async ([key, image]) => {
        // Remove trailing space from key
        key = key.trim();

        // Check image isn't too large
        if (image.size > MAXIMUM_IMG_SIZE) {
          logger.error(`Image ${image.name.trim()} is too large it's ${(image.size / ONE_MB).toFixed(2)} MBs. The maximum allowed image size is ${(MAXIMUM_IMG_SIZE / ONE_MB).toFixed(2)} MBs`);
          return {
            key,
            upload: 'failed',
            error: `Image ${image.name.trim()} is too large it's ${(image.size / ONE_MB).toFixed(2)} MBs. The maximum allowed image size is ${(MAXIMUM_IMG_SIZE / ONE_MB).toFixed(2)} MBs`,
          };
        }

        try {
          // Set options
          const options = {};
          // Set image title to specified title or undefined
          options.title = req.body[`${key}_title`];
          // Set image caption to specified caption or undefined
          options.caption = req.body[`${key}_caption`];

          // Upload image
          await uploadReportImage(req.report.id, key, image.data, image.name, options);

          // Return that this image was uploaded successfully
          return {key, upload: 'successful'};
        } catch (error) {
          logger.error(`Image key: ${key} failed to upload ${error}`);
          return {key, upload: 'failed', error};
        }
      }));
      return res.status(HTTP_STATUS.MULTI_STATUS).json(results);
    } catch (error) {
      logger.error(`Error while uploading images ${error}`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: `Error while uploading images ${error}`}});
    }
  });

// Route for getting an image
router.route('/retrieve/:key')
  .get(async (req, res) => {
    let keys = [];

    if (!req.params.key.includes(',')) {
      keys.push(req.params.key);
    } else {
      keys = req.params.key.split(',');
    }

    try {
      const results = await db.models.imageData.scope('public').findAll({
        where: {
          key: {[Op.in]: keys},
          reportId: req.report.id,
        },
      });

      const output = {};
      results.forEach((value) => {
        output[value.key] = value;
      });

      return res.json(output);
    } catch (error) {
      logger.error(`There was an error finding image data ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to query image data'}});
    }
  });

router.route('/expression-density-graphs')
  .get(async (req, res) => {
    try {
      const results = await db.models.imageData.scope('public').findAll({
        where: {
          key: {[Op.like]: 'expDensity.%'},
          reportId: req.report.id,
        },
        order: [['key', 'ASC']],
      });

      const output = {};
      results.forEach((value) => {
        output[value.key] = value;
      });

      return res.json(output);
    } catch (error) {
      logger.error(error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to query image data'}});
    }
  });

router.route('/mutation-burden')
  .get(async (req, res) => {
    try {
      const results = await db.models.imageData.scope('public').findAll({
        where: {
          key: {[Op.like]: 'mutationBurden.%'},
          reportId: req.report.id,
        },
        order: [['key', 'ASC']],
      });

      const output = {};
      results.forEach((value) => {
        output[value.key] = value;
      });

      return res.json(output);
    } catch (error) {
      logger.error(error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to query image data'}});
    }
  });

router.route('/subtype-plots')
  .get(async (req, res) => {
    try {
      const results = await db.models.imageData.scope('public').findAll({
        where: {
          key: {[Op.like]: 'subtypePlot.%'},
          reportId: req.report.id,
        },
        order: [['key', 'ASC']],
      });

      const output = {};
      results.forEach((value) => {
        output[value.key] = value;
      });

      return res.json(output);
    } catch (error) {
      logger.error(error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to query image data'}});
    }
  });

module.exports = router;
