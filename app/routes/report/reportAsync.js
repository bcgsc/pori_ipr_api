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

    if (req.body.sampleInfo) {
      // Clean sampleInfo input
      const cleanSampleInfo = [];
      for (const sampleInfoObject of req.body.sampleInfo) {
        cleanSampleInfo.push(
          {
            sample: (sampleInfoObject.Sample) ? sampleInfoObject.Sample : sampleInfoObject.sample,
            pathoTc: (sampleInfoObject['Patho TC']) ? sampleInfoObject['Patho TC'] : sampleInfoObject.pathoTc,
            biopsySite: (sampleInfoObject['Biopsy Site']) ? sampleInfoObject['Biopsy Site'] : sampleInfoObject.biopsySite,
            biopsyType: (sampleInfoObject['Biopsy Type']) ? sampleInfoObject['Biopsy Type'] : sampleInfoObject.biopsyType,
            sampleName: (sampleInfoObject['Sample Name']) ? sampleInfoObject['Sample Name'] : sampleInfoObject.sampleName,
            primarySite: (sampleInfoObject['Primary Site']) ? sampleInfoObject['Primary Site'] : sampleInfoObject.primarySite,
            collectionDate: (sampleInfoObject['Collection Date']) ? sampleInfoObject['Collection Date'] : sampleInfoObject.collectionDate,
          },
        );
      }
      req.body.sampleInfo = cleanSampleInfo;
    }

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
