const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const db = require('../../models');
const logger = require('../../log');
const {uploadLegendImage, updateLegendImage} = require('../report/images');

const router = express.Router({mergeParams: true});

// Middleware for legend lookup
router.param('legend', async (req, res, next, legendIdent) => {
  let result;
  try {
    result = await db.models.legend.findOne({
      where: {ident: legendIdent},
    });
  } catch (error) {
    logger.error(`Unable to lookup legend error: ${error.message}`);
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
    // Use the first uploaded file, if any, to replace the stored image
    const [image] = req.files ? Object.values(req.files) : [];

    try {
      await db.transaction(async (transaction) => {
        if (image) {
          await updateLegendImage(req.legend, image, {updates: req.body, userId: req.user.id, transaction});
        } else {
          await req.legend.update(req.body, {userId: req.user.id, transaction});
        }
      });
      await req.legend.reload();
      return res.json(req.legend.view('public'));
    } catch (error) {
      logger.error(`Error while updating legend image ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({error: {message: 'Error while updating legend image'}});
    }
  })
  .delete(async (req, res) => {
    const force = (req.query.force === 'true');

    try {
      await db.transaction(async (transaction) => {
        await req.legend.destroy({force, transaction});
      });
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error while deleting legend image ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({error: {message: 'Error while deleting legend image'}});
    }
  });

// Route for querying legend by numeric id
router.route('/:legendId(\\d+)')
  .get(async (req, res) => {
    try {
      const legend = await db.models.legend.findByPk(req.params.legendId);
      if (!legend) {
        logger.error(`Unable to find legend with id ${req.params.legendId}`);
        const msg = 'Unable to find the requested legend';
        return res.status(HTTP_STATUS.NOT_FOUND)
          .json({error: {message: msg}});
      }
      return res.json(legend.view('public'));
    } catch (error) {
      logger.error(`Unable to lookup legend by id error: ${error.message}`);
      const msg = 'Unable to lookup legend';
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({error: {message: msg}});
    }
  });

// Route for adding a legend image
router.route('/')
  .get(async (req, res) => {
    try {
      const legends = await db.models.legend.findAll();
      return res.json(legends.map((legend) => {return legend.view('public');}));
    } catch (error) {
      logger.error(`Error while retrieving legend images ${error.message}`);
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
            default: req.body.default,
          };

          // Load image
          let legend;
          await db.transaction(async (transaction) => {
            legend = await uploadLegendImage(image.data, {...options, transaction});
          });

          // Return that this image was uploaded successfully
          results.push({name: key, upload: 'successful', legendId: legend.id});
        } catch (error) {
          results.push({name: key, upload: 'failed', error: {message: error.message}});
        }
      }
      return res.status(HTTP_STATUS.MULTI_STATUS).json(results);
    } catch (error) {
      logger.error(`Error while uploading images ${error.message}`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: `Error while uploading images ${error.message}`}});
    }
  });

module.exports = router;
