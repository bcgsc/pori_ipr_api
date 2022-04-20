const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});

const db = require('../../models');
const logger = require('../../log');
const cache = require('../../cache');

const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {REPORT_UPDATE_BASE_URI} = require('../../constants');


// Generate schemas
const updateSchema = schemaGenerator(db.models.probeResults, {
  baseUri: REPORT_UPDATE_BASE_URI,
  properties: {
    gene: {
      type: 'string',
      format: 'uuid',
      description: 'Gene ident',
    },
  },
  nothingRequired: true,
});

router.param('target', async (req, res, next, altIdent) => {
  let result;
  try {
    result = await db.models.probeResults.findOne({
      where: {ident: altIdent, reportId: req.report.id},
      include: [
        {model: db.models.genes.scope('minimal'), as: 'gene'},
      ],
    });
  } catch (error) {
    logger.error(`Unable to find probe target ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {message: 'Unable to find probe target'},
    });
  }

  if (!result) {
    logger.error('Unable to locate probe target');
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: 'Unable to locate probe target'},
    });
  }

  // Add probe result to request
  req.target = result;
  return next();
});

// Handle requests for probe results
router.route('/:target([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.target.view('public'));
  })
  .put(async (req, res) => {
    // Validate request against schema
    try {
      validateAgainstSchema(updateSchema, req.body, false);
    } catch (error) {
      const message = `Error while validating probe results update request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // If a new gene is provided, search for the gene
    // and if found use it to replace the old gene
    if (req.body.gene) {
      let gene;
      try {
        gene = await db.models.genes.findOne({
          where: {ident: req.body.gene, reportId: req.report.id},
        });
      } catch (error) {
        logger.error(`Error while searching for gene ${req.body.gene} ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          error: {message: 'Error while searching for gene'},
        });
      }

      if (!gene) {
        logger.error(`Unable to find gene ${req.body.gene} for report ${req.report.ident}`);
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: {message: 'Unable to find gene'},
        });
      }

      req.body.geneId = gene.id;
    }

    try {
      await req.target.update(req.body, {userId: req.user.id});
      await req.target.reload();
      return res.json(req.target.view('public'));
    } catch (error) {
      logger.error(`Unable to update probe target ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to update probe target'},
      });
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    try {
      await req.target.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Unable to remove probe target ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to remove probe target'},
      });
    }
  });


router.route('/')
  .get(async (req, res) => {
    const key = `/reports/${req.report.ident}/probe-results`;

    try {
      const cacheResults = await cache.get(key);

      if (cacheResults) {
        res.type('json');
        return res.send(cacheResults);
      }
    } catch (error) {
      logger.error(`Error while checking cache for probe results ${error}`);
    }

    try {
      const results = await db.models.probeResults.scope('public').findAll({
        where: {reportId: req.report.id},
        order: [['geneId', 'ASC']],
      });

      if (key) {
        cache.set(key, JSON.stringify(results), 'EX', 14400);
      }

      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve resource ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to retrieve resource'},
      });
    }
  });

module.exports = router;
