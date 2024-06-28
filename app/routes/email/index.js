const {StatusCodes} = require('http-status-codes');
const express = require('express');
const {sendEmail} = require('../../libs/email');

const router = express.Router({mergeParams: true});
const logger = require('../../log');

/**
 * Test email endpoint
 */
router.get('/', async (req, res) => {
  try {
    const resp = await sendEmail('Test email', 'Test email', req.user.email);
    logger.info({message: `Test email sent to ${req.user.email}`, response: resp.response});
    return res.status(StatusCodes.OK).json({message: 'Email sent successfully'});
  } catch (err) {
    logger.error(err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({message: `Error while sending email: ${err}`});
  }
});

module.exports = router;
