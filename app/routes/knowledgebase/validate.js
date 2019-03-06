const express = require('express');
const {execSync} = require('child_process');

const router = express.Router({mergeParams: true});
const {logger} = process;


// Test python library wrapper
router.route('/events')
  .post((req, res) => {
    try {
      // Take input and call child
      execSync(`/projects/tumour_char/analysis_scripts/python/centos06/anaconda3_v4.3.0/envs/python3.4/bin/python${process.cwd()}/app/libs/kbSanitationWrapper.py --input "${req.body.events_expression}"`);
      return res.json({valid: req.body.events_expression});
    } catch (error) {
      logger.error(error);
      return res.status(400).json({error: {message: 'Unable to validate the provided input', code: 'KBValidationFailed'}});
    }
  });

module.exports = router;
