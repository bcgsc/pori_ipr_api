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
const createSchema = schemaGenerator(db.models.signatureVariants, {
  baseUri: REPORT_CREATE_BASE_URI,
});
const updateSchema = schemaGenerator(db.models.signatureVariants, {
  baseUri: REPORT_UPDATE_BASE_URI, nothingRequired: true,
});

// Middleware for signatureVariants
router.param('sigv', async (req, res, next, ident) => {
  let result;
  try {
    result = await db.models.signatureVariants.findOne({
      where: {ident, reportId: req.report.id},
    });
  } catch (error) {
    logger.error(`Unable to lookup signatureVariants data error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to lookup signatureVariants data'}});
  }

  if (!result) {
    logger.error(`Unable to find signatureVariants data for ${req.report.ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: `Unable to find signatureVariants data for ${req.report.ident}`}});
  }

  // Add signatureVariants data to request
  req.sigv = result;
  return next();
});

// Handle requests for signatureVariants by ident
router.route('/:sigv([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.sigv.view('public'));
  })
  .put(async (req, res) => {
    // Validate request against schema
    try {
      validateAgainstSchema(updateSchema, req.body, false);
    } catch (error) {
      const message = `Error while validating signatureVariants update request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }
    // Update db entry
    try {
      await req.sigv.update(req.body, {userId: req.user.id});
      return res.json(req.sigv.view('public'));
    } catch (error) {
      logger.error(`Unable to update signatureVariants data ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update signatureVariants data'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    try {
      await req.sigv.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Unable to remove signatureVariants data ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove signatureVariants data'}});
    }
  });

// Handle requests for SIGV's
router.route('/')
  .get(async (req, res) => {
    const key = `/reports/${req.report.ident}/signature-variants`;

    try {
      const cacheResults = await cache.get(key);

      if (cacheResults) {
        res.type('json');
        return res.send(cacheResults);
      }
    } catch (error) {
      logger.error(`Error while checking cache for signatureVariants data ${error}`);
    }

    try {
      const results = await db.models.signatureVariants.scope('public').findAll({
        where: {reportId: req.report.id},
        include: [
          {
            model: db.models.kbMatches,
            attributes: ['ident'],
            include: [
              {
                model: db.models.kbMatchedStatements,
                as: 'kbMatchedStatements',
                attributes:
                  ['category'],
                through: {attributes: []},
              },
            ],
          },
        ],
      });

      if (key) {
        cache.set(key, JSON.stringify(results), 'EX', 14400);
      }

      return res.json(results);
    } catch (error) {
      logger.error(`Unable to lookup signatureVariants for report ${req.report.ident} error: ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to lookup the signatureVariants for ${req.report.ident}`}});
    }
  })
  .post(async (req, res) => {
    // Validate request against schema
    try {
      await validateAgainstSchema(createSchema, req.body);
    } catch (error) {
      const message = `Error while validating signatureVariants create request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // Create new entry in db
    try {
      const result = await db.models.signatureVariants.create({
        ...req.body,
        reportId: req.report.id,
      });
      return res.status(HTTP_STATUS.CREATED).json(result.view('public'));
    } catch (error) {
      logger.error(`Unable to create signatureVariants ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to create signatureVariants'}});
    }
  });

module.exports = router;
