const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {v4: uuidv4} = require('uuid');
const reportAsyncMiddleware = require('../../middleware/reportAsync');

const {addJobToReportQueue} = require('../../queue');
const db = require('../../models');
const logger = require('../../log');

const router = express.Router({mergeParams: true});

const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {getUserProjects, cleanSampleInfo, cleanSeqQC} = require('../../libs/helperFunctions');

// Generate schema's
const reportUploadSchema = require('../../schemas/report/reportUpload')(true);

// Register report middleware
router.param('reportAsync', reportAsyncMiddleware);

// Act on all reports
router.route('/')
  .post(async (req, res) => {
    const {
      query: {ignore_extra_fields},
    } = req;

    let userProjects;
    try {
      userProjects = await getUserProjects(db.models.project, req.user);
      userProjects = userProjects.map((proj) => {
        return proj.name;
      });
    } catch (error) {
      const message = `Error while trying to get project access ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message}});
    }

    if (req.body.project && !userProjects.includes(req.body.project)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({error: `User does not have access to project ${req.body.project}`});
    }
    if (req.body.sampleInfo) {
      req.body.sampleInfo = cleanSampleInfo(req.body.sampleInfo);
    }

    if (req.body.seqQC) {
      req.body.seqQC = cleanSeqQC(req.body.seqQC);

      req.body.dataType = req.body.seqQC.filter(
        (item) => {return item.sample?.startsWith('Tumour');},
      ).map(
        (item) => {return item.sample.replace(/^Tumour\s+/i, '');},
      ).join(', ');
    }

    try {
      // eslint-disable-next-line camelcase
      if (ignore_extra_fields) {
        validateAgainstSchema(reportUploadSchema, req.body, true, ignore_extra_fields);
      } else {
        validateAgainstSchema(reportUploadSchema, req.body);
      }
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
    return res.json({report: req.report.view('public')});
  });

module.exports = router;
