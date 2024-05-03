const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {v4: uuidv4} = require('uuid');
const reportAsyncMiddleware = require('../../middleware/reportAsync');

const {addJobToReportQueue} = require('../../queue');

const logger = require('../../log');

const router = express.Router({mergeParams: true});

const validateAgainstSchema = require('../../libs/validateAgainstSchema');

// Generate schema's
const reportUploadSchema = require('../../schemas/report/reportUpload')(true);

// Register report middleware
router.param('reportAsync', reportAsyncMiddleware);

// Act on all reports
router.route('/')
  .post(async (req, res) => {
    // validate loaded report against schema

    try {
      validateAgainstSchema(reportUploadSchema, req.body);
    } catch (error) {
      const message = `There was an error validating the report content ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    req.body.createdBy_id = req.user.id;
    const customIdent = uuidv4();
    req.body.ident = customIdent;
    const job = await addJobToReportQueue(req.body, customIdent);

    return res.status(HTTP_STATUS.ACCEPTED).json({message: 'Report is being processed', ident: job.id});
  });

router.route('/:reportAsync')
  .get((req, res) => {
    return res.json(req.report.view('public'));
  });

module.exports = router;
