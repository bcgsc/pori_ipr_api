const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});

const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const schema = require('../../schemas/report/mutationSignature');
const db = require('../../models');
const logger = require('../../log');

router.route('/')
  .get(async (req, res) => {
    // Get all mutation signatures for this report
    const filters = {reportId: req.report.id};
    if (req.query.selected !== undefined) {
      filters.selected = req.query.selected;
    }
    try {
      const results = await db.models.mutationSignature.scope('public').findAll({
        where: filters,
      });
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve mutation signatures ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve mutation signatures'}});
    }
  });


// Middleware for kbMatches
router.param('mutationSignature', async (req, res, next, ident) => {
  let result;
  try {
    result = await db.models.mutationSignature.findOne({
      where: {ident},
    });
  } catch (error) {
    logger.log(`Error while trying to get mutation signature ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while trying to get mutation signature'}});
  }

  if (!result) {
    logger.error(`Unable to locate mutation signature (${ident})`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: `Unable to locate mutation signature (${ident})`}});
  }

  req.mutationSignature = result;
  return next();
});


router.route('/:mutationSignature([A-z0-9-]{36})')
  .put(async (req, res) => {
    const {mutationSignature} = req;
    try {
      // validate against the model
      validateAgainstSchema(schema, req.body);
    } catch (err) {
      const message = `There was an error updating mutation signature ${err}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }
    // Update db entry
    try {
      await mutationSignature.update(req.body);
      return res.json(mutationSignature.view('public'));
    } catch (error) {
      logger.error(`Unable to update mutationSignature ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update mutationSignature'}});
    }
  });


module.exports = router;
