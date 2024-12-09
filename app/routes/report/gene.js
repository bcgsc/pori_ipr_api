const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');

const db = require('../../models');
const logger = require('../../log');
const cache = require('../../cache');
const {generateKey} = require('../../libs/cacheFunctions');

const router = express.Router({mergeParams: true});

const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {REPORT_CREATE_BASE_URI, REPORT_UPDATE_BASE_URI} = require('../../constants');

// Generate schemas
const createSchema = schemaGenerator(db.models.genes, {
  baseUri: REPORT_CREATE_BASE_URI,
});
const updateSchema = schemaGenerator(db.models.genes, {
  baseUri: REPORT_UPDATE_BASE_URI, nothingRequired: true,
});

// Middleware for genes
router.param('geneName', async (req, res, next, geneName) => {
  let result;
  try {
    result = await db.models.genes.findOne({
      where: {
        reportId: req.report.id,
        name: geneName,
      },
    });
  } catch (error) {
    logger.error(`Error while trying to find gene ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {message: 'Error while trying to find gene'},
    });
  }

  if (!result) {
    logger.error('Unable to locate gene');
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: 'Unable to locate gene'},
    });
  }

  // Add gene to request
  req.gene = result;
  return next();
});

// Handle requests for genes
router.route('/:geneName')
  .get((req, res) => {
    return res.json(req.gene.view('public'));
  })
  .put(async (req, res) => {
    // Validate request against schema
    try {
      validateAgainstSchema(updateSchema, req.body, false);
    } catch (error) {
      const message = `Error while validating gene update request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // If updating gene name, check that it is not already taken
    if (req.body.name && req.body.name !== req.gene.name) {
      let dupGene;
      try {
        dupGene = await db.models.genes.findOne({
          where: {
            reportId: req.report.id,
            name: req.body.name,
          },
          attributes: ['id', 'ident'],
        });
      } catch (error) {
        logger.error(`Error while trying to find duplicate gene ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          error: {message: 'Error while trying to find duplicate gene'},
        });
      }

      if (dupGene) {
        logger.error(`Gene name: ${req.body.name} is already taken for report: ${req.report.ident}`);
        return res.status(HTTP_STATUS.CONFLICT).json({
          error: {message: 'Gene name is already taken'},
        });
      }
    }

    try {
      await req.gene.update(req.body, {userId: req.user.id});
      return res.json(req.gene.view('public'));
    } catch (error) {
      logger.error(`Unable to update gene ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to update gene'},
      });
    }
  });

router.route('/')
  .get(async (req, res) => {
    // Get all targeted genes for this report
    const {search} = req.query;
    const queryParams = (search) ? {search} : {};

    const key = generateKey(`/reports/${req.report.ident}/genes`, queryParams);

    try {
      const cacheResults = await cache.get(key);

      if (cacheResults) {
        res.type('json');
        return res.send(cacheResults);
      }
    } catch (error) {
      logger.error(`Error while checking cache for genes ${error}`);
    }

    try {
      const results = await db.models.genes.scope('public').findAll({
        where: {
          reportId: req.report.id,
          ...((search) ? {name: {[Op.iLike]: `%${search}%`}} : {}),
        },
        order: [['name', 'ASC']],
      });

      if (key) {
        cache.set(key, JSON.stringify(results), 'EX', 14400);
      }

      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve genes ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to retrieve genes'},
      });
    }
  })
  .post(async (req, res) => {
    // Validate request against schema
    try {
      validateAgainstSchema(createSchema, req.body);
    } catch (error) {
      const message = `Error while validating gene create request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // Create new entry in db
    try {
      const result = await db.models.genes.create({
        ...req.body,
        reportId: req.report.id,
      });
      return res.status(HTTP_STATUS.CREATED).json(result.view('public'));
    } catch (error) {
      logger.error(`Unable to create gene ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to create gene'},
      });
    }
  });

module.exports = router;
