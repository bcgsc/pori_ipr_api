const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');

const db = require('../../../models');
const logger = require('../../../log');
const {uploadReportImage} = require('../images');
const {VALID_IMAGE_KEY_PATTERN} = require('../../../constants');

const router = express.Router({mergeParams: true});

// Middleware for report image
router.param('image', async (req, res, next, imgIdent) => {
  let result;
  try {
    result = await db.models.imageData.findOne({
      where: {ident: imgIdent, reportId: req.report.id},
    });
  } catch (error) {
    logger.error(`Unable to lookup image error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to lookup image'}});
  }

  if (!result) {
    const message = `Unable to find image ${imgIdent} for report ${req.report.ident}`;
    logger.error(message);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message}});
  }

  // Add image data to request
  req.image = result;
  return next();
});

// Routes for operating on specific images
// !!Should not add update routes for report images (PUT, PATCH, etc.)
// because updates will create duplicate image entries!!
router.route('/:image([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.image.view('public'));
  })
  .delete(async (req, res) => {
    // Whether to hard or soft delete image
    const force = (typeof req.query.force === 'boolean') ? req.query.force : false;

    // Delete report image
    try {
      await req.image.destroy({force});
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error while deleting report image ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while deleting report image'}});
    }
  });

// Route for adding an image
router.route('/')
  .post(async (req, res) => {
    // Check that image files were uploaded
    if (!req.files || Object.keys(req.files).length === 0) {
      logger.error('No attached images to upload');
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'No attached images to upload'}});
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

        try {
          // Set options (value or undefined)
          const options = {
            filename: image.name.trim(),
            title: req.body[`${key}_title`],
            caption: req.body[`${key}_caption`],
          };

          // Load image
          await uploadReportImage(req.report.id, key, image.data, options);

          // Return that this image was uploaded successfully
          return {key, upload: 'successful'};
        } catch (error) {
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
    const keys = (req.params.key.includes(',')) ? req.params.key.split(',') : [req.params.key];

    try {
      const results = await db.models.imageData.scope('public').findAll({
        where: {
          reportId: req.report.id,
          key: keys,
        },
        order: [['key', 'ASC']],
      });

      return res.json(results);
    } catch (error) {
      logger.error(`Error while getting report images with key: ${req.params.key} ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while getting report images by key'},
      });
    }
  });

router.route('/expression-density-graphs')
  .get(async (req, res) => {
    try {
      const results = await db.models.imageData.scope('public').findAll({
        where: {
          reportId: req.report.id,
          key: {[Op.like]: 'expDensity.%'},
        },
        order: [['key', 'ASC']],
      });

      return res.json(results);
    } catch (error) {
      logger.error(`Error while getting expression density graphs ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error whilte getting expression density graphs'},
      });
    }
  });

router.route('/mutation-burden')
  .get(async (req, res) => {
    try {
      const results = await db.models.imageData.scope('public').findAll({
        where: {
          reportId: req.report.id,
          key: {[Op.like]: 'mutationBurden.%'},
        },
        order: [['key', 'ASC']],
      });

      return res.json(results);
    } catch (error) {
      logger.error(`Error while getting mutation burden images ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while getting mutation burden images'},
      });
    }
  });

router.route('/subtype-plots')
  .get(async (req, res) => {
    try {
      const results = await db.models.imageData.scope('public').findAll({
        where: {
          reportId: req.report.id,
          key: {[Op.like]: 'subtypePlot.%'},
        },
        order: [['key', 'ASC']],
      });

      return res.json(results);
    } catch (error) {
      logger.error(`Error while getting subtype plots ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while getting subtype plots'},
      });
    }
  });

module.exports = router;
