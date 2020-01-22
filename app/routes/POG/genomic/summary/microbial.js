const Ajv = require('ajv');
const express = require('express');
const db = require('../../../../models');
const logger = require('../../../../log');
const ajvErrorFormatter = require('../../../../libs/ajvErrorFormatter');
const schemaGenerator = require('../../../../schemas/report/basicReportSchemaGenerator');

const router = express.Router({mergeParams: true});
const ajv = new Ajv({useDefaults: true, coerceTypes: true, logger});

// Middleware for Variant Counts
router.use('/', async (req, res, next) => {
  // Get Mutation Summary for this POG
  let result;
  try {
    result = await db.models.summary_microbial.scope('public').findOne({where: {report_id: req.report.id}});
  } catch (error) {
    logger.error(`Unable to lookup microbial data for ${req.POG.POGID} error: ${error}`);
    return res.status(500).json({error: {message: `Unable to lookup the microbial data for ${req.POG.POGID}`, code: 'failedMicrobialQuery'}});
  }

  req.microbial = result;
  return next();
});

// Handle requests for Variant Counts
router.route('/')
  .get((req, res) => {
    // Get Patient History
    return res.json(req.microbial);
  })
  .post(async (req, res) => {
    // generate microbial schema
    const schema = schemaGenerator(db.models.summary_microbial);

    // validate microbial data
    const valid = await ajv.validate(schema, req.body);

    if (!valid) {
      ajvErrorFormatter(ajv.errors, logger);
      return res.status(400).json({error: {message: 'The provided microbial data is not valid', cause: ajv.errors}});
    }

    // add report id to new entry
    req.body.report_id = req.report.id;

    try {
      const result = await db.models.summary_microbial.create(req.body);
      return res.json(result);
    } catch (error) {
      logger.error(`Unable to create microbial entry ${error}`);
      return res.status(500).json({error: {message: 'Unable to create microbial entry'}, cause: error.errors});
    }
  });

module.exports = router;
