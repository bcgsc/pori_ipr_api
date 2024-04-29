const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const {addJobToReportQueue} = require('../../queue');

const createReport = require('../../libs/createReport');
const logger = require('../../log');

const router = express.Router({mergeParams: true});

const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const { STATUS_CODES } = require('http');

// Generate schema's
const reportUploadSchema = require('../../schemas/report/reportUpload')(true);


// Act on all reports
router.route('/')
  .post(async (req, res) => {
    // validate loaded report against schema
    console.log('test');
    addJobToReportQueue({});
    // try {
    //   validateAgainstSchema(reportUploadSchema, req.body);
    // } catch (error) {
    //   const message = `There was an error validating the report content ${error}`;
    //   logger.error(message);
    //   return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    // }

    // try {
    //   req.body.createdBy_id = req.user.id;
    //   const reportIdent = await createReport(req.body);

    //   return res.status(HTTP_STATUS.CREATED).json({message: 'Report upload was successful', ident: reportIdent});
    // } catch (error) {
    //   logger.error(error.message || error);
    //   return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: error.message}});
    // }
    return res.status(HTTP_STATUS.OK).json({message: 'test'});
  });

module.exports = router;
