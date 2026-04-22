const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const db = require('../../../models');
const logger = require('../../../log');
const {uploadLegendImage} = require('../images');

const router = express.Router({mergeParams: true});

// Middleware for legend image
router.param('legend', async (req, res, next, imgIdent) => {
  let result;
  try {
    result = await db.models.legend.findOne({
      where: {ident: imgIdent, reportId: req.report.id},
    });
  } catch (error) {
    logger.error(`Unable to lookup legend image error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to lookup legend image'}});
  }

  if (!result) {
    const message = `Unable to find legend image ${imgIdent} for report ${req.report.ident}`;
    logger.error(message);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message}});
  }

  // Add legend data to request
  req.legend = result;
  return next();
});

// Routes for operating on specific legends
// !!Should not add update routes for legend images (PUT, PATCH, etc.)
// because updates will create duplicate image entries!!
router.route('/:legend([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.legend.view('public'));
  })
  .delete(async (req, res) => {
    // Whether to hard or soft delete legend
    const force = (typeof req.query.force === 'boolean') ? req.query.force : false;

    // Delete legend image
    try {
      await req.legend.destroy({force});
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error while deleting legend image ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while deleting legend image'}});
    }
  });

// Route for adding a legend image
router.route('/')
  .post(async (req, res) => {
    // Check that image files were uploaded
    if (!req.files || Object.keys(req.files).length === 0) {
      logger.error('No attached images to upload');
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'No attached images to upload'}});
    }

    const versions = [];

    for (let [version, value] of Object.entries(req.files)) {
      version = version.trim();

      // Check if version is a duplicate
      if (versions.includes(version) || Array.isArray(value)) {
        logger.error(`Duplicate versions are not allowed. Duplicate version: ${version}`);
        return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: `Duplicate versions are not allowed. Duplicate version: ${version}`}});
      }

      versions.push(version);
    }

    try {
      const results = await Promise.all(Object.entries(req.files).map(async ([version, image]) => {
        // Remove trailing space from version
        version = version.trim();

        try {
          // Set options (value or undefined)
          const options = {
            filename: image.name.trim(),
            title: req.body[`${version}_title`],
            caption: req.body[`${version}_caption`],
          };

          // Load image
          await uploadLegendImage(req.report.id, version, image.data, options);
          // Return that this image was uploaded successfully
          return {version, upload: 'successful'};
        } catch (error) {
          return {version, upload: 'failed', error};
        }
      }));
      return res.status(HTTP_STATUS.MULTI_STATUS).json(results);
    } catch (error) {
      logger.error(`Error while uploading images ${error}`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: `Error while uploading images ${error}`}});
    }
  });

// Route for getting a legend image
router.route('/retrieve/:version')
  .get(async (req, res) => {
    const versions = (req.params.version.includes(',')) ? req.params.version.split(',') : [req.params.version];

    try {
      const results = await db.models.imageData.scope('public').findAll({
        where: {
          reportId: req.report.id,
          version: versions,
        },
        order: [['version', 'ASC']],
      });

      return res.json(results);
    } catch (error) {
      logger.error(`Error while getting report images with version: ${req.params.version} ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while getting report images by version'},
      });
    }
  });

// Route for getting a list of legend versions for the report
router.route('/versionlist')
  .get(async (req, res) => {
    try {
      const results = await db.models.legend.scope('versionlist').findAll({
        where: {
          reportId: req.report.id,
        },
        order: [['version', 'ASC']],
      });

      return res.json(results);
    } catch (error) {
      logger.error(`Error while getting report legend versionlist: ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while getting report legend versionlist'},
      });
    }
  });

module.exports = router;
