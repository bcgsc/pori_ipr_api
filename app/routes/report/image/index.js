const fs = require('fs');
const util = require('util');
const tmp = require('tmp-promise');
const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');

const writeFile = util.promisify(fs.writeFile);

const db = require('../../../models');
const logger = require('../../../log');
const {loadImage} = require('../images');

const router = express.Router({mergeParams: true});

// Maximum number of images per upload
const MAXIMUM_NUM_IMAGES = 5;
// The size of 1 GB, which is 1073741824 bytes
const ONE_GB = 1073741824;
// Maximum image size
const MAXIMUM_IMG_SIZE = ONE_GB;

// Register middleware

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

    try {
      const results = await Promise.all(Object.entries(req.files).map(async ([key, image]) => {
        // Remove trailing space from key
        key = key.trim();

        // Don't allow duplicate keys
        if (Array.isArray(image)) {
          logger.error(`Duplicate keys are not allowed. Duplicate key: ${key}`);
          return {key, upload: 'failed', error: `Duplicate keys are not allowed. Duplicate key: ${key}`};
        }

        // Check image isn't too large
        if (image.size > MAXIMUM_IMG_SIZE) {
          logger.error(`Image ${image.name.trim()} is too large it's ${(image.size / ONE_GB).toFixed(2)} GBs. The maximum allowed image size is ${(MAXIMUM_IMG_SIZE / ONE_GB).toFixed(2)} GBs`);
          return {
            key,
            upload: 'failed',
            error: `Image ${image.name.trim()} is too large it's ${(image.size / ONE_GB).toFixed(2)} GBs. The maximum allowed image size is ${(MAXIMUM_IMG_SIZE / ONE_GB).toFixed(2)} GBs`,
          };
        }

        let cleanup;
        try {
          // Get temp folder
          const tempDir = await tmp.dir({unsafeCleanup: true});
          cleanup = tempDir.cleanup;

          // Set filename and path
          const file = `${tempDir.path}/${image.name.trim()}`;

          // Write file to temp folder
          await writeFile(file, image.data);

          // Load image
          await loadImage(req.report.id, key, file);

          // Return that this image was uploaded successfully
          return {key, upload: 'successful'};
        } catch (error) {
          return {key, upload: 'failed', error};
        } finally {
          cleanup();
        }
      }));
      return res.status(HTTP_STATUS.CREATED).json(results);
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

router.route('/mutation-summary')
  .get(async (req, res) => {
    try {
      const results = await db.models.imageData.scope('public').findAll({
        where: {
          key: {
            [Op.or]: [
              {[Op.like]: 'mutation_summary.%'},
              {[Op.like]: 'mutSummary.%'},
            ],
          },
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
