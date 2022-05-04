const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});

const db = require('../../models');
const logger = require('../../log');
const cache = require('../../cache');

const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {REPORT_CREATE_BASE_URI, REPORT_UPDATE_BASE_URI} = require('../../constants');

// Generate schema's
const createSchema = schemaGenerator(db.models.hlaTypes, {baseUri: REPORT_CREATE_BASE_URI});
const updateSchema = schemaGenerator(db.models.hlaTypes, {baseUri: REPORT_UPDATE_BASE_URI, nothingRequired: true});


router.param('hlaType', async (req, res, next, ident) => {
  let result;
  try {
    result = await db.models.hlaTypes.findOne({
      where: {ident, reportId: req.report.id},
    });
  } catch (error) {
    logger.error(`Error while processing request ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {message: 'Unable to process the request'},
    });
  }

  if (!result) {
    logger.error('Unable to locate the requested resource');
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: 'Unable to locate the requested resource'},
    });
  }

  req.hlaType = result;
  return next();
});

router.route('/:hlaType([A-z0-9-]{36})')
  .get(async (req, res) => {
    const {hlaType} = req;
    return res.json(hlaType.view('public'));
  })
  .put(async (req, res) => {
    const {hlaType} = req;
    try {
      // validate against the model
      validateAgainstSchema(updateSchema, req.body, false);
    } catch (err) {
      const message = `There was an error updating hlaType ${err}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }
    // Update db entry
    try {
      await hlaType.update(req.body, {userId: req.user.id});
      return res.json(hlaType.view('public'));
    } catch (error) {
      logger.error(`Unable to update hlaType ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to update hlaType'},
      });
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    const {hlaType} = req;
    try {
      await hlaType.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Unable to remove hlaType ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to remove hlaType'},
      });
    }
  });

router.route('/')
  .get(async (req, res) => {
    const key = `/reports/${req.report.ident}/hla-types`;

    try {
      const cacheResults = await cache.get(key);

      if (cacheResults) {
        res.type('json');
        return res.send(cacheResults);
      }
    } catch (error) {
      logger.error(`Error while checking cache for hla types ${error}`);
    }

    try {
      const results = await db.models.hlaTypes.scope('public').findAll({
        where: {reportId: req.report.id},
      });

      if (key) {
        cache.set(key, JSON.stringify(results), 'EX', 14400);
      }

      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve hla types ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to retrieve hla types'},
      });
    }
  })
  .post(async (req, res) => {
    const {body, report: {id: reportId}} = req;
    try {
      // validate against the model
      validateAgainstSchema(createSchema, req.body);
    } catch (err) {
      const message = `There was an error creating the hlaType ${err}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }
    try {
      const result = await db.models.hlaTypes.create({
        ...body,
        reportId,
      });
      return res.status(HTTP_STATUS.CREATED).json(result.view('public'));
    } catch (error) {
      logger.error(`Unable to create new hla type entry ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to create new hla type entry'},
      });
    }
  });


module.exports = router;
