const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const db = require('../../models');
const logger = require('../../log');
const {uploadLegendImage} = require('../report/images');

const router = express.Router({mergeParams: true});

// Middleware for legend lookup
router.param('legend', async (req, res, next, legendIdent) => {
  let result;
  try {
    result = await db.models.legend.findOne({
      where: {ident: legendIdent},
    });
  } catch (error) {
    logger.error(`Unable to lookup legend error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to lookup legend'}});
  }

  if (!result) {
    logger.error(`Unable to find legend ${legendIdent}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to find the requested legend'}});
  }

  req.legend = result;
  return next();
});

router.route('/:legend([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.legend.view('public'));
  })
  .put(async (req, res) => {
    try {
      await req.legend.update(req.body, {userId: req.user.id});
      await req.legend.ensureDefaultExists();
      return res.json(req.legend.view('public'));
    } catch (error) {
      logger.error(`Error while updating legend image ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while updating legend image'}});
    }
  })
  .delete(async (req, res) => {
    // Whether to hard or soft delete legend
    const force = (req.query.force === 'true');

    // Delete legend image
    try {
      await req.legend.destroy({force});
      await req.legend.ensureDefaultExists();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error while deleting legend image ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while deleting legend image'}});
    }
  });

// Route for adding a legend image
router.route('/')
  .get(async (req, res) => {
    try {
      const legends = await db.models.legend.findAll();
      return res.json(legends.map((legend) => {return legend.view('public');}));
    } catch (error) {
      logger.error(`Error while retrieving legend images ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while retrieving legend images'}});
    }
  })
  .post(async (req, res) => {
    // Check that image files were uploaded
    if (!req.files || Object.keys(req.files).length === 0) {
      logger.error('No attached images to upload');
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'No attached images to upload'}});
    }

    try {
      const results = [];
      for (const [key, image] of Object.entries(req.files)) {
        try {
          // Set options (value or undefined)
          const options = {
            filename: image.name.trim(),
            name: req.body.name || image.name.trim(),
            default: req.body.default === undefined ? false : req.body.default,
          };

          // Load image
          const createdLegend = await uploadLegendImage(image.data, options);
          await createdLegend.ensureDefaultExists();

          // Return that this image was uploaded successfully
          results.push({name: key, upload: 'successful'});
        } catch (error) {
          results.push({name: key, upload: 'failed', error});
        }
      }
      return res.status(HTTP_STATUS.MULTI_STATUS).json(results);
    } catch (error) {
      logger.error(`Error while uploading images ${error}`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: `Error while uploading images ${error}`}});
    }
  });

module.exports = router;
